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
  description?: string;
  lyrics?: string;
}

export interface Playlist {
  id: string;
  name: string;
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectFolder: () => Promise<string | null>;
      scanFolder: (folderPath: string, copyOnImport?: boolean) => Promise<TrackMetadata[]>;
      getPlaylists: () => Promise<Playlist[]>;
      createPlaylist: (name: string) => Promise<string>;
      addToPlaylist: (playlistId: string, trackUuid: string) => Promise<{ error?: string }>;
      removeFromPlaylist: (playlistId: string, trackUuid: string) => Promise<void>;
      getPlaylistTracks: (playlistId: string) => Promise<TrackMetadata[]>;
      updateTrack: (uuid: string, data: Partial<TrackMetadata>) => Promise<void>;
      deletePlaylist: (id: string) => Promise<void>;
      getThemes: () => Promise<any[]>;
      startServer: (port?: number) => Promise<void>;
      stopServer: () => Promise<void>;
      getServerStatus: () => Promise<{ isRunning: boolean, ip: string, port: number }>;
    }
  }
}
