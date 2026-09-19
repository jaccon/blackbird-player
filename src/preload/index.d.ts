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
      startServer: (port?: number) => Promise<void>;
      stopServer: () => Promise<void>;
      getServerStatus: () => Promise<{ isRunning: boolean, ip: string, port: number }>;
      getHiddenTracks: (folderId?: string | null) => Promise<TrackMetadata[]>;
      getHiddenFolders: () => Promise<HiddenFolder[]>;
      createHiddenFolder: (name: string) => Promise<HiddenFolder>;
      renameHiddenFolder: (id: string, name: string) => Promise<{ changes: number }>;
      deleteHiddenFolder: (id: string) => Promise<{ changes: number }>;
      moveHiddenTrack: (trackUuid: string, folderId: string | null) => Promise<{ changes: number }>;
      hideTracks: (uuids: string[], folderId?: string | null) => Promise<{ changes: number }>;
      unhideTracks: (uuids: string[]) => Promise<{ changes: number }>;
      getSetting: (key: string) => Promise<string | null>;
      setSetting: (key: string, value: string) => Promise<any>;
      importHiddenFiles: (folderId?: string | null) => Promise<{ success: boolean, count: number }>;
      resetAppData: (options?: { clearCovers?: boolean }) => Promise<{ success: boolean, error?: string }>;
    }
  }
}
