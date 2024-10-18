export interface Track {
  id: string;
  metadata: TrackMetadata;
  source: TrackSource;
  file: TrackFile;
}

export interface TrackMetadata {
  artists: string[];
  title: string;
  isRemix: boolean;
  isExtended: boolean;
  duration: number;
}

export interface TrackSource {
  spotifyLink?: string;
  youtubeLink?: string;
  soundcloudLink?: string;
}

export interface TrackFile {

}
