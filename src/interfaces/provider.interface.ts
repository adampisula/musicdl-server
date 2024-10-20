import { Link } from './links.interface'
import { TrackFile, TrackMetadata } from "./track.interface";

export interface MusicProvider {
  isUrlSupported(url: string): boolean;
  getMetadata(url: string): Promise<TrackMetadata>;
  search(track: TrackMetadata, preferExtended: boolean): Promise<Link[]>;
}

export interface DownloadableMusicProvider extends MusicProvider {
  download(url: string): Promise<string>;
}
