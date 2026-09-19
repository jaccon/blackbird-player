import { app, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { dbOps, pluginsDir, DBPlugin } from './database';

export interface PluginManifest {
  id: string;
  name: string;
  version?: string;
  description?: string;
  author?: string;
  icon?: string;
  main?: string;
  styles?: string;
  enabled?: boolean;
}

export class PluginService {
  /**
   * Initializes plugin storage and registers built-in and discovered plugins.
   */
  static async init(): Promise<void> {
    try {
      if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
      }

      // Check for built-in plugins in resources (supports both dev and packaged asar.unpacked)
      const unpackedDir = path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'plugins');
      const builtinDir = app.isPackaged && fs.existsSync(unpackedDir)
        ? unpackedDir
        : path.join(app.getAppPath(), 'resources', 'plugins');

      if (fs.existsSync(builtinDir)) {
        const builtinPlugins = fs.readdirSync(builtinDir, { withFileTypes: true });
        for (const dirent of builtinPlugins) {
          if (dirent.isDirectory()) {
            const pluginSrc = path.join(builtinDir, dirent.name);
            const userDest = path.join(pluginsDir, dirent.name);
            const manifestPath = path.join(pluginSrc, 'manifest.json');

            if (fs.existsSync(manifestPath)) {
              // Copy to user plugins dir if not already installed
              if (!fs.existsSync(userDest)) {
                fs.cpSync(pluginSrc, userDest, { recursive: true });
              }
            }
          }
        }
      }

      // Scan user plugins folder and sync SQLite
      this.syncInstalledPlugins();
    } catch (err) {
      console.error('[PluginService] Failed to initialize plugins:', err);
    }
  }

  /**
   * Synchronizes plugins on disk with the database, removing stale records.
   */
  static syncInstalledPlugins(): DBPlugin[] {
    if (!fs.existsSync(pluginsDir)) return [];

    const existingDirs = fs.readdirSync(pluginsDir, { withFileTypes: true });
    const discoveredIds = new Set<string>();

    for (const dirent of existingDirs) {
      if (dirent.isDirectory()) {
        const folderPath = path.join(pluginsDir, dirent.name);
        const manifestPath = path.join(folderPath, 'manifest.json');

        if (fs.existsSync(manifestPath)) {
          try {
            const manifestRaw = fs.readFileSync(manifestPath, 'utf-8');
            const manifest: PluginManifest = JSON.parse(manifestRaw);

            if (manifest.id && manifest.name) {
              discoveredIds.add(manifest.id);
              const existing = dbOps.getPluginById(manifest.id);
              const enabled = existing !== undefined ? existing.enabled : (manifest.enabled !== false ? 1 : 0);

              dbOps.upsertPlugin({
                id: manifest.id,
                name: manifest.name,
                version: manifest.version || '1.0.0',
                description: manifest.description || '',
                author: manifest.author || '',
                icon: manifest.icon || 'puzzle',
                main: manifest.main || 'index.js',
                styles: manifest.styles || '',
                enabled,
                folder_path: folderPath
              });
            }
          } catch (e) {
            console.warn(`[PluginService] Failed to parse manifest for ${dirent.name}:`, e);
          }
        }
      }
    }

    // Prune database entries whose folder no longer exists
    const dbPlugins = dbOps.getPlugins();
    for (const p of dbPlugins) {
      if (!discoveredIds.has(p.id) && !fs.existsSync(p.folder_path)) {
        dbOps.deletePlugin(p.id);
      }
    }

    return dbOps.getPlugins();
  }

  /**
   * Installs a plugin from a remote ZIP URL with timeouts and HTTPS enforcement.
   */
  static async installFromUrl(url: string): Promise<{ success: boolean; plugin?: DBPlugin; error?: string }> {
    try {
      if (!url || typeof url !== 'string') {
        return { success: false, error: 'Invalid URL provided' };
      }

      const trimmedUrl = url.trim();
      const parsedUrl = new URL(trimmedUrl);
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        return { success: false, error: 'Only HTTP and HTTPS URLs are supported.' };
      }

      // 30 seconds timeout
      const response = await fetch(trimmedUrl, {
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        return { success: false, error: `Failed to download plugin: HTTP ${response.status} ${response.statusText}` };
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return this.installFromBuffer(buffer);
    } catch (err: any) {
      console.error('[PluginService] installFromUrl error:', err);
      return { success: false, error: err.message || 'Error downloading plugin archive' };
    }
  }

  /**
   * Installs a plugin from a local ZIP file using dialog picker.
   */
  static async installFromFile(): Promise<{ success: boolean; plugin?: DBPlugin; error?: string }> {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Select Plugin Archive',
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Installation cancelled' };
      }

      const buffer = fs.readFileSync(result.filePaths[0]);
      return this.installFromBuffer(buffer);
    } catch (err: any) {
      console.error('[PluginService] installFromFile error:', err);
      return { success: false, error: err.message || 'Error installing plugin file' };
    }
  }

  /**
   * Extracts and validates plugin buffer in a staged directory with Zip-Slip protection.
   */
  static installFromBuffer(buffer: Buffer): { success: boolean; plugin?: DBPlugin; error?: string } {
    const tempDir = path.join(pluginsDir, `.temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const stagingDir = path.join(tempDir, 'content');

    try {
      fs.mkdirSync(stagingDir, { recursive: true });
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();

      // Find root manifest in archive (ignoring __MACOSX / AppleDouble entries)
      const validEntries = zipEntries.filter(
        e => !e.entryName.includes('__MACOSX') && !path.basename(e.entryName).startsWith('._')
      );

      const manifestEntry =
        validEntries.find(e => e.entryName === 'manifest.json' && !e.isDirectory) ||
        validEntries.find(e => /^[^/]+\/manifest\.json$/.test(e.entryName) && !e.isDirectory);

      if (!manifestEntry) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        return { success: false, error: 'Invalid plugin archive: manifest.json is missing at root' };
      }

      // Read manifest from entry
      const manifestContent = manifestEntry.getData().toString('utf-8');
      const manifest: PluginManifest = JSON.parse(manifestContent);

      if (!manifest.id || !manifest.name) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        return { success: false, error: 'manifest.json missing required id or name' };
      }

      const sanitizedId = manifest.id.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (!sanitizedId) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        return { success: false, error: 'Invalid plugin id format' };
      }

      // Prefix removal if manifest is inside a single root folder
      const prefixToRemove = manifestEntry.entryName.includes('/')
        ? manifestEntry.entryName.substring(0, manifestEntry.entryName.lastIndexOf('/') + 1)
        : '';

      const normalizedStagingDir = path.resolve(stagingDir) + path.sep;

      // Extract all valid entries safely into stagingDir
      for (const entry of validEntries) {
        if (entry.isDirectory) continue;

        let relativeEntryPath = entry.entryName;
        if (prefixToRemove && relativeEntryPath.startsWith(prefixToRemove)) {
          relativeEntryPath = relativeEntryPath.substring(prefixToRemove.length);
        }

        const resolvedPath = path.resolve(stagingDir, relativeEntryPath);
        if (!resolvedPath.startsWith(normalizedStagingDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          throw new Error(`Security Exception: archive entry ${entry.entryName} traverses outside staging directory`);
        }

        const entryDir = path.dirname(resolvedPath);
        if (!fs.existsSync(entryDir)) {
          fs.mkdirSync(entryDir, { recursive: true });
        }

        fs.writeFileSync(resolvedPath, entry.getData());
      }

      // Verify entrypoint script exists in staging
      const mainScript = manifest.main || 'index.js';
      const mainScriptPath = path.join(stagingDir, mainScript);
      if (!fs.existsSync(mainScriptPath)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        return { success: false, error: `Plugin entrypoint script "${mainScript}" was not found in archive.` };
      }

      // Safe commit to target directory
      const targetDir = path.join(pluginsDir, sanitizedId);
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }

      fs.cpSync(stagingDir, targetDir, { recursive: true });
      fs.rmSync(tempDir, { recursive: true, force: true });

      const dbPlugin: DBPlugin = {
        id: sanitizedId,
        name: manifest.name,
        version: manifest.version || '1.0.0',
        description: manifest.description || '',
        author: manifest.author || '',
        icon: manifest.icon || 'puzzle',
        main: mainScript,
        styles: manifest.styles || '',
        enabled: 1,
        folder_path: targetDir
      };

      dbOps.upsertPlugin(dbPlugin);
      return { success: true, plugin: dbPlugin };
    } catch (err: any) {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      console.error('[PluginService] installFromBuffer error:', err);
      return { success: false, error: err.message || 'Failed to extract plugin archive' };
    }
  }

  /**
   * Toggles a plugin enabled/disabled status.
   */
  static togglePlugin(id: string, enabled: boolean): { success: boolean; enabled?: boolean; error?: string } {
    try {
      dbOps.togglePlugin(id, enabled ? 1 : 0);
      return { success: true, enabled };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Deletes a plugin and its files from disk within pluginsDir boundary.
   */
  static deletePlugin(id: string): { success: boolean; error?: string } {
    try {
      const plugin = dbOps.getPluginById(id);
      if (plugin) {
        const normalizedPluginsDir = path.resolve(pluginsDir) + path.sep;
        const resolvedPluginFolder = path.resolve(plugin.folder_path);

        if (resolvedPluginFolder.startsWith(normalizedPluginsDir) && fs.existsSync(resolvedPluginFolder)) {
          fs.rmSync(resolvedPluginFolder, { recursive: true, force: true });
        }
        dbOps.deletePlugin(id);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Retrieves a plugin's code asset (main script or stylesheet) safely.
   */
  static getPluginAsset(id: string, assetType: 'main' | 'styles'): { success: boolean; content?: string; error?: string } {
    try {
      const plugin = dbOps.getPluginById(id);
      if (!plugin) {
        return { success: false, error: `Plugin ${id} not found` };
      }

      if (!plugin.enabled) {
        return { success: false, error: `Plugin ${id} is disabled` };
      }

      const fileName = assetType === 'main' ? plugin.main : plugin.styles;
      if (!fileName) {
        return { success: true, content: '' };
      }

      const normalizedPluginDir = path.resolve(plugin.folder_path) + path.sep;
      const filePath = path.resolve(plugin.folder_path, fileName);

      if (!filePath.startsWith(normalizedPluginDir)) {
        return { success: false, error: 'Path traversal detected in plugin asset' };
      }

      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return { success: false, error: `Asset file ${fileName} does not exist` };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
