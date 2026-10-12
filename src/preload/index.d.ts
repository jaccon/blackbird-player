import { ElectronAPI } from '@electron-toolkit/preload'

export interface TrackMetadata {
  uuid: string;
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  duration?: number;
  trackNumber?: number;
  genre?: string[];
  cover?: string;
  filePath: string;
  fileName: string;
  format: string;
  mimetype?: string;
  kind?: string;
  is_favorite?: number;
  is_hidden?: number;
  hiddenFolderId?: string | null;
  mediaFolderId?: string | null;
  description?: string;
  lyrics?: string;
}

export interface Playlist {
  id: string;
  name: string;
  trackCount?: number;
  totalDuration?: number;
}

export interface HiddenFolder {
  id: string;
  name: string;
  created_at?: string;
  trackCount?: number;
}

export interface MediaFolder {
  id: string;
  name: string;
  type: 'music' | 'video' | 'photo';
  parent_id?: string | null;
  parentId?: string | null;
  created_at?: string;
  trackCount?: number;
  subfolderCount?: number;
}

export interface PluginInfo {
  id: string;
  name: string;
  version?: string;
  description?: string;
  author?: string;
  icon?: string;
  main?: string;
  styles?: string;
  enabled: number;
  folder_path: string;
  installed_at?: string;
}

export interface YtDlpStatus {
  available: boolean;
  path?: string;
  ffmpegAvailable: boolean;
}

export interface YtProgress {
  percent: number;
  speed?: string;
  eta?: string;
  status: 'starting' | 'downloading' | 'converting' | 'completed' | 'error';
  message?: string;
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectFolder: () => Promise<string | null>;
      scanFolder: (folderPath: string, copyOnImport?: boolean) => Promise<any>;
      getPlaylists: () => Promise<Playlist[]>;
      createPlaylist: (name: string) => Promise<string>;
      addToPlaylist: (playlistId: string, trackUuid: string) => Promise<{ error?: string }>;
      removeFromPlaylist: (playlistId: string, trackUuid: string) => Promise<void>;
      getPlaylistTracks: (playlistId: string) => Promise<TrackMetadata[]>;
      updateTrack: (uuid: string, data: Partial<TrackMetadata>) => Promise<void>;
      deletePlaylist: (id: string) => Promise<void>;
      getLibrary: () => Promise<TrackMetadata[]>;
      getTrackCover: (uuid: string, filePath: string) => Promise<string | null>;
      getThemes: () => Promise<any[]>;
      setWindowThemeColor: (bgColor: string, symbolColor?: string) => Promise<void>;
      deleteTracks: (uuids: string[]) => Promise<any>;
      getFavorites: () => Promise<TrackMetadata[]>;
      getPlayHistory: () => Promise<any[]>;
      selectFiles: () => Promise<string[] | null>;
      getYTMeta: (url: string) => Promise<any>;
      processMeta: (filePath: string) => Promise<any>;
      upsertTrack: (track: any) => Promise<any>;
      importTheme: () => Promise<any>;
      recordPlay: (trackUuid: string) => Promise<any>;
      getStatistics: () => Promise<any>;
      startCastScan: () => Promise<any>;
      startCastPlayback: (deviceId: string, trackUuid: string) => Promise<any>;
      saveUserRadio: (radio: any) => Promise<any>;
      getUserRadios: () => Promise<any[]>;
      deleteUserRadio: (id: string) => Promise<any>;
      fetchRemoteJson: (url: string) => Promise<any>;
      getCastDevices: () => Promise<any>;
      openPath: (folderPath: string) => Promise<any>;
      getAppPaths: () => Promise<any>;
      exportSettings: () => Promise<any>;
      importSettings: () => Promise<any>;
      startServer: (port?: number) => Promise<any>;
      stopServer: () => Promise<any>;
      openExternal: (url: string) => Promise<void>;
      getServerStatus: () => Promise<{
        isRunning: boolean;
        ip: string;
        port: number;
        connectedCount: number;
        clients: Array<{ id: string; ip: string; device: string; lastSeen: number }>;
      }>;
      getHiddenTracks: (folderId?: string | null) => Promise<TrackMetadata[]>;
      getHiddenFolders: () => Promise<HiddenFolder[]>;
      createHiddenFolder: (name: string) => Promise<HiddenFolder>;
      renameHiddenFolder: (id: string, name: string) => Promise<{ changes: number }>;
      deleteHiddenFolder: (id: string) => Promise<{ changes: number }>;
      moveHiddenTrack: (trackUuid: string, folderId: string | null) => Promise<{ changes: number }>;
      hideTracks: (uuids: string[], folderId?: string | null) => Promise<{ changes: number }>;
      unhideTracks: (uuids: string[]) => Promise<{ changes: number }>;
      // Media Folders (Music, Video & Photos)
      getMediaFolders: (type: 'music' | 'video' | 'photo') => Promise<MediaFolder[]>;
      createMediaFolder: (name: string, type: 'music' | 'video' | 'photo', parentId?: string | null) => Promise<MediaFolder>;
      renameMediaFolder: (id: string, name: string) => Promise<{ changes: number }>;
      deleteMediaFolder: (id: string) => Promise<{ changes: number }>;
      moveTrackToMediaFolder: (trackUuid: string, folderId: string | null) => Promise<{ changes: number }>;
      moveTracksToMediaFolder: (trackUuids: string[], folderId: string | null) => Promise<{ changes: number }>;
      getSetting: (key: string) => Promise<string | null>;
      setSetting: (key: string, value: string) => Promise<any>;
      importHiddenFiles: (folderId?: string | null) => Promise<{ success: boolean, count: number }>;
      resetAppData: (options?: { clearCovers?: boolean }) => Promise<{ success: boolean, error?: string }>;
      // Plugins
      getPlugins: () => Promise<PluginInfo[]>;
      installPluginFromUrl: (url: string) => Promise<{ success: boolean; plugin?: PluginInfo; error?: string }>;
      installPluginFromFile: () => Promise<{ success: boolean; plugin?: PluginInfo; error?: string }>;
      togglePlugin: (id: string, enabled: boolean) => Promise<{ success: boolean; enabled?: boolean; error?: string }>;
      deletePlugin: (id: string) => Promise<{ success: boolean; error?: string }>;
      getPluginAsset: (id: string, assetType: 'main' | 'styles') => Promise<{ success: boolean; content?: string; error?: string }>;
      // YouTube / yt-dlp
      checkYtDlp: () => Promise<YtDlpStatus>;
      getYtVideoInfo: (url: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      convertYtMedia: (options: { url: string; format: 'mp3' | 'mp4'; customTitle?: string; customArtist?: string }) => Promise<{ success: boolean; track?: TrackMetadata; error?: string }>;
      onYtDlpProgress: (callback: (progress: YtProgress) => void) => () => void;
      // M3U APIs
      selectM3uFile: () => Promise<string[] | null>;
      importM3uFile: (filePath: string) => Promise<number>;
      importM3uUrl: (url: string) => Promise<number>;
      getM3uChannels: () => Promise<any[]>;
      toggleM3uFavorite: (id: string) => Promise<any>;
      deleteM3uChannel: (id: string) => Promise<any>;
      startM3uScan: () => Promise<{ total: number; validCount: number; removedCount: number; cancelled: boolean }>;
      cancelM3uScan: () => Promise<boolean>;
      isM3uScanInProgress: () => Promise<boolean>;
      onM3uScanProgress: (callback: (progress: {
        current: number;
        total: number;
        validCount: number;
        removedCount: number;
        currentChannelName: string;
        status: 'checking' | 'ok' | 'removed';
        isFinished: boolean;
        wasCancelled: boolean;
      }) => void) => () => void;
    }
  }
}
