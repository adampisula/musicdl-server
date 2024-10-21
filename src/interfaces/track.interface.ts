export interface Track {
  metadata: TrackMetadata;
  source: TrackSource;
  file: TrackFile;
}

export interface TrackMetadata {
  artists: string[];
  title: string;
  isRemix: boolean;
  durationSeconds: number;
}

export interface TrackSource {
  spotifyId?: string;
  youtubeId?: string;
  // soundcloudLink?: string;
}

export interface TrackFile {
  s3ObjectId: string;
  sha1Checksum: string;
  fileExtension: string;
  size: number;
  createdAt: Date;
  expiresAt: Date;
}
