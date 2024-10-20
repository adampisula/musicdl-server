import Container, { Service } from "typedi";

import { Track, TrackMetadata } from "@interfaces/track.interface";
import { YouTubeProvider } from "@providers/youtube.provider";
import { SoundCloudProvider } from "@providers/soundcloud.provider";
import { SpotifyProvider } from "@providers/spotify.provider";
import { Action } from "@/interfaces/actions.interface";
import { HttpException } from "@/exceptions/HttpException";
import { Links } from '@/interfaces/links.interface'
import { BackblazeRepository } from '@/repositories/backblaze.repository'
import { sha1 } from '@/utils/checksum'
import path from 'path'
import { unlink } from "fs/promises";


@Service()
export class TrackService {
  private youtube = Container.get(YouTubeProvider);
  private soundcloud = Container.get(SoundCloudProvider);
  private spotify = Container.get(SpotifyProvider);
  private files = Container.get(BackblazeRepository);

  public determineAction(url: string): Action {
    if (this.spotify.isUrlSupported(url)) {
      return Action.SelectSource;
    } else if (this.youtube.isUrlSupported(url)) {
      return Action.Download;
    } else if (this.soundcloud.isUrlSupported(url)) {
      return Action.Download;
    }

    return Action.UnknownURL;
  }

  public async getMetadata(url: string): Promise<TrackMetadata> {
    if (this.spotify.isUrlSupported(url)) {
      return await this.spotify.getMetadata(url);
    } else if (this.youtube.isUrlSupported(url)) {
      return await this.youtube.getMetadata(url);
    } else if (this.soundcloud.isUrlSupported(url)) {
      return await this.soundcloud.getMetadata(url);
    }

    throw new HttpException(400, "URL not supported");
  }

  public async getAlternatives(url: string, preferExtended: boolean = false): Promise<Links> {
    const metadata = await this.getMetadata(url);
    console.log(`OG track duration: ${metadata.durationSeconds}`);

    const youtubeLinks = await this.youtube.search(metadata, preferExtended);
    // const soundcloudLinks = await this.soundcloud.search();

    return {
      youtube: youtubeLinks,
      soundcloud: [],
    };
  }

  public async download(url: string): Promise<string> {
    let tempFilePath: string;
    
    if (this.youtube.isUrlSupported(url)) {
      tempFilePath = await this.youtube.download(url);
    } else {
      throw new HttpException(400, "URL not supported");
    }

    const fileName = path.basename(tempFilePath);  // get it from download?
    const checksum = await sha1(tempFilePath);

    const objectId = await this.files.upload(tempFilePath, fileName, checksum);
    console.log("Uploaded file to Backblaze:", objectId);

    await unlink(tempFilePath);

    return objectId;
  }

  public async getDownloadUrl(objectId: string): Promise<string> {
    return await this.files.getDownloadUrl(objectId);
  }
}
