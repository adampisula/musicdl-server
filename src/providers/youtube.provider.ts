import { Service } from "typedi";
import moment from "moment";
import { TrackFile, TrackMetadata } from "@interfaces/track.interface";
import { DownloadableMusicProvider } from "@interfaces/provider.interface";
import { YOUTUBE_API_KEY } from '@/config'
import { Link } from '@/interfaces/links.interface'
import { logger } from '@/utils/logger';

@Service()
export class YouTubeProvider implements DownloadableMusicProvider {
  public isUrlSupported(url: string): boolean {
    const re = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;
    return re.test(url);
  };

  public async getMetadata(url: string): Promise<TrackMetadata> {
    return {
      title: "",
      artists: [""],
      isRemix: false,
      isExtended: false,
      duration: 0,
    };
  };

  public async download(url: string): Promise<TrackFile> {
    return Promise.resolve({});
  };

  // https://developers.google.com/youtube/v3/docs/videos
  private async getDetails(id: string): Promise<{
    duration: number;
  }> {
    const requestUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    const params = {
      key: YOUTUBE_API_KEY,
      part: "contentDetails",
      id: id,
    };

    for(const key in params) {
      requestUrl.searchParams.set(key, params[key]);
    }

    const response = await fetch(requestUrl);
    const isoDuration = (await response.json())["items"][0]["contentDetails"]["duration"];

    return {
      duration: moment.duration(isoDuration).asSeconds(),
    };
  }

  private calculateSimilarity(
    track: TrackMetadata,
    videoTitle: string,
    channelName: string,
    videoDuration: number,
    preferExtended: boolean,
  ): number {
    let durationWeight: number;
    let titleWeight: number;

    if(preferExtended) {
      durationWeight = 0.2;
      titleWeight = 0.8;
    } else {
      durationWeight = 0.7;
      titleWeight = 0.3;
    }

    const durationMatch = 1 - Math.abs(track.duration - videoDuration) / track.duration;
    const titleMatch = 1;

    return durationMatch * durationWeight + titleMatch * titleWeight;
  }

  // https://developers.google.com/youtube/v3/docs/search/list
  public async search(track: TrackMetadata, preferExtended: boolean = false): Promise<Link[]> {
    const requestUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    const params = {
      key: YOUTUBE_API_KEY,
      part: "snippet",
      maxResults: 5,
      order: "relevance",
      // order: "viewCount",
      safeSearch: "none",
      type: "video",
      videoEmbeddable: "any",
      q: `${track.artists[0]} ${track.title}${preferExtended ? " extended" : ""}`,
    };

    for(const key in params) {
      requestUrl.searchParams.set(key, params[key]);
    }

    logger.debug(`Making query to YouTube: "${params.q}"`);

    const response = await fetch(requestUrl);
    const searchResults = (await response.json())["items"];

    const matches: Link[] = [];

    for(const searchResult of searchResults) {
      const videoId = searchResult["id"]["videoId"];
      const videoTitle = searchResult["snippet"]["title"];
      const channelName = searchResult["snippet"]["channelTitle"];
      const details = await this.getDetails(videoId);

      const similarity = this.calculateSimilarity(
        track,
        videoTitle,
        channelName,
        details.duration,
        preferExtended,
      );


      matches.push({
        link: `https://youtube.com/watch?v=${videoId}`,
        similarity,
      });
    }

    return matches.sort((a, b) => b.similarity - a.similarity);
  };
}
