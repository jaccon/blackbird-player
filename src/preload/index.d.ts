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
      scanFolder: (folderPath: string) => Promise<TrackMetadata[]>;
      getPlaylists: () => Promise<Playlist[]>;
      createPlaylist: (name: string) => Promise<string>;
      addToPlaylist: (playlistId: string, trackUuid: string) => Promise<{ error?: string }>;
      getPlaylistTracks: (playlistId: string) => Promise<TrackMetadata[]>;
      updateTrack: (uuid: string, data: Partial<TrackMetadata>) => Promise<void>;
      deletePlaylist: (id: string) => Promise<void>;
      getThemes: () => Promise<any[]>;
    }
  }
}
