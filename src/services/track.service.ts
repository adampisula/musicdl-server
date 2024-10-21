import Container, { Service } from "typedi";

import { Track, TrackMetadata } from "@interfaces/track.interface";
import { YouTubeProvider } from "@providers/youtube.provider";
import { SoundCloudProvider } from "@providers/soundcloud.provider";
import { SpotifyProvider } from "@providers/spotify.provider";
import { HttpException } from "@/exceptions/HttpException";
import { Links } from "@/interfaces/links.interface";
import { BackblazeRepository } from "@/repositories/backblaze.repository";
import { sha1 } from "@/utils/checksum.util";
import path from "path"
import moment from "moment";
import { unlink } from "fs/promises";
import { PgTracksRepository } from "@/repositories/pgTracks.repository";
import { fileSize } from '@/utils/fileSize.util'
import { setID3Tags } from '@/utils/id3Tags'
import { logger } from '@/utils/logger.util'


@Service()
export class TrackService {
  private youtube = Container.get(YouTubeProvider);
  private soundcloud = Container.get(SoundCloudProvider);
  private spotify = Container.get(SpotifyProvider);
  private files = Container.get(BackblazeRepository);
  private tracks = Container.get(PgTracksRepository);

  public async getDownloadUrl(url: string): Promise<string> {
    let track: Track;
    let providerId: string;

    if(this.spotify.isUrlSupported(url)) {
      providerId = await this.spotify.getProviderId(url);
    } else if(this.youtube.isUrlSupported(url)) {
      providerId = await this.youtube.getProviderId(url);
    } else {
      throw new HttpException(400, "URL not supported");
    }

    try {
      track = await this.tracks.getTrackByProviderId(providerId);
      logger.debug(`Track found in database - ${JSON.stringify({track, url})}`);
    } catch(e) {
      throw new HttpException(404, "Track not found");
    }

    if(track.file.expiresAt < new Date()) {
      logger.debug(`Track expired, preparing to fetch - ${JSON.stringify({track, url})}`);

      if(!track.source.youtubeId) {  // or soundcloud
        logger.error(`Track missing source URL - ${JSON.stringify({track, url})}`);
        throw new HttpException(500, "Track missing source URL. This should never happen");
      }

      logger.debug(`Track expired. Running fetch - ${JSON.stringify({track, url})}`);
      await this.fetch({
        youtubeUrl: await this.youtube.constructUrl(track.source.youtubeId),  // or soundcloud
      }, track.metadata);

      track = await this.tracks.getTrackByProviderId(providerId);
    }

    logger.debug(`Getting download URL from the database - ${JSON.stringify({track, url})}`);
    return await this.files.getDownloadUrl(track.file.s3ObjectId);
  }

  public async getMetadata(url: string): Promise<{
    metadata: TrackMetadata,
    isSuggestions: boolean,
  }> {
    let providerId: string;

    if(this.spotify.isUrlSupported(url)) {
      providerId = await this.spotify.getProviderId(url);
    } else if(this.youtube.isUrlSupported(url)) {
      providerId = await this.youtube.getProviderId(url);
    } else {
      throw new HttpException(400, "URL not supported");
    }

    try {
      const track = await this.tracks.getTrackByProviderId(providerId);
      logger.debug(`Track found in database - ${JSON.stringify(track)}`);

      return {
        metadata: track.metadata,
        isSuggestions: false,
      };
    } catch(e) {}

    if (this.spotify.isUrlSupported(url)) {
      logger.debug(`Track not found in database. Fetching metadata from Spotify API - ${JSON.stringify({url})}`);

      return {
        metadata: await this.spotify.getMetadata(url),
        isSuggestions: false,
      };
    } else if (this.youtube.isUrlSupported(url)) {
      logger.debug(`Track not found in database. Fetching metadata from YouTube API - ${JSON.stringify({url})}`);

      return {
        metadata: await this.youtube.getMetadata(url),
        isSuggestions: true,
      };
    } else if (this.soundcloud.isUrlSupported(url)) {
      logger.debug(`Track not found in database. Fetching metadata from SoundCloud API - ${JSON.stringify({url})}`);

      return {
        metadata: await this.soundcloud.getMetadata(url),
        isSuggestions: true,
      };
    }

    throw new HttpException(400, "URL not supported");
  }

  public async getAlternatives(url: string, preferExtended: boolean = false): Promise<Links> {
    const { metadata } = await this.getMetadata(url);

    const youtubeLinks = await this.youtube.search(metadata, preferExtended);
    // const soundcloudLinks = await this.soundcloud.search();

    return {
      youtube: youtubeLinks,
      soundcloud: [],
    };
  }

  public async fetch(
    source: {
      spotifyUrl?: string,
      youtubeUrl: string,
    },
    metadata: TrackMetadata
  ): Promise<void> {
    let tempFilePath: string;

    if (this.youtube.isUrlSupported(source.youtubeUrl)) {
      logger.debug(`Downloading from YouTube - ${JSON.stringify(source)}`);
      tempFilePath = await this.youtube.download(source.youtubeUrl);
    } else {
      throw new HttpException(400, "URL not supported");
    }

    logger.debug(`Setting ID3 data - ${JSON.stringify(source)}`);
    await setID3Tags(tempFilePath, metadata);

    const fileName = path.basename(tempFilePath);
    const fileExtension = fileName.split(".").pop();
    const size = await fileSize(tempFilePath);
    const checksum = await sha1(tempFilePath);

    logger.debug(`Uploading temporary file to external drive - ${JSON.stringify(source)}`);
    const objectId = await this.files.upload(tempFilePath, fileName, checksum);

    logger.debug(`Deleting temporary file - ${JSON.stringify(source)}`);
    await unlink(tempFilePath);

    let existingTrack: Track | undefined;

    try {
      const providerId = await this.youtube.getProviderId(source.youtubeUrl);
      existingTrack = await this.tracks.getTrackByProviderId(providerId);
    } catch(e) {  // track doesn't exist
      // do nothing
    }

    const createdAt = new Date();
    const expiresAt = moment(new Date()).add(29, "days").toDate();

    if(existingTrack) {
      logger.debug(`Track exists. Adding new file - ${JSON.stringify(source)}`);
      await this.tracks.addFile({
        trackId: existingTrack.id,
        s3ObjectId: objectId,
        sha1Checksum: checksum,
        fileExtension: fileExtension,
        size,
        createdAt,
        expiresAt,
      });
    } else {
      logger.debug(`Track doesn't exist. Adding new track - ${JSON.stringify(source)}`);
      await this.tracks.addTrack({
        id: 0,  // dummy ID
        metadata,
        source: {
          spotifyId: source.spotifyUrl ? await this.spotify.getProviderId(source.spotifyUrl) : undefined,
          youtubeId: await this.youtube.getProviderId(source.youtubeUrl),
        },
        file: {
          s3ObjectId: objectId,
          sha1Checksum: checksum,
          fileExtension: fileExtension,
          size,
          createdAt,
          expiresAt,
        },
      });
    }
  }
}
