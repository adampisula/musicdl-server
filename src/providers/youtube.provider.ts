import Container, { Inject, Service } from "typedi";
import moment from "moment";
import { TrackFile, TrackMetadata } from "@interfaces/track.interface";
import { DownloadableMusicProvider } from "@interfaces/provider.interface";
import { YOUTUBE_API_KEY } from '@/config'
import { Link } from '@/interfaces/links.interface'
import { logger } from '@/utils/logger';
import { YtDlpProvider } from './ytdlp.provider'

@Service()
export class YouTubeProvider implements DownloadableMusicProvider {
  private downloaderProvider = Container.get(YtDlpProvider);
  private musicVideoCategoryId: string;
  private musicVideoCategoryIdLastRefresh: Date;

  private SIMILARITY_THRESHOLD = 0.5;
  private AUTO_MATCH_THRESHOLD = 0.98;
  private REGION_CODE = "SE";

  public isUrlSupported(url: string): boolean {
    const re = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;
    return re.test(url);
  };

  public async getMetadata(url: string): Promise<TrackMetadata> {
    return {
      title: "",
      artists: [""],
      isRemix: false,
      durationSeconds: 0,
    };
  };

  public async download(url: string): Promise<string> {
    return await this.downloaderProvider.download(url);
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

    const durationMatch = 1 - Math.abs(track.durationSeconds - videoDuration) / track.durationSeconds;
    const titleMatch = 1;

    return durationMatch * durationWeight + titleMatch * titleWeight;
  }

  private async getMusicVideoCategoryId(): Promise<string> {
    if(
      !this.musicVideoCategoryId ||
      !this.musicVideoCategoryIdLastRefresh ||
      Date.now() - this.musicVideoCategoryIdLastRefresh.getTime() > 86400000  // older than 1 day
    ) {
      const requestUrl = new URL("https://www.googleapis.com/youtube/v3/videoCategories");
      const params = {
        key: YOUTUBE_API_KEY,
        part: "snippet",
        regionCode: this.REGION_CODE,
      };

      for(const key in params) {
        requestUrl.searchParams.set(key, params[key]);
      }

      const response = await fetch(requestUrl);
      const categoriesResults = (await response.json())["items"];

      for(const category of categoriesResults) {
        if(category["snippet"]["title"] === "Music") {
          this.musicVideoCategoryId = category["id"];
          this.musicVideoCategoryIdLastRefresh = new Date();
          break;
        }
      }
    } 

    return this.musicVideoCategoryId;
  }

  private constructQuery(trackMeta: TrackMetadata, preferExtended: boolean = false): string {
    return `${trackMeta.artists[0]} ${trackMeta.title}${preferExtended ? " extended" : ""}`;
  }

  private async runYoutubeSearch(requestUrl: URL, params: object, trackMeta: TrackMetadata, preferExtended: boolean): Promise<Link[]> {
    for(const key in params) {
      requestUrl.searchParams.set(key, params[key]);
    }

    logger.debug(`Making query to YouTube: "${params["q"]}"`);

    const response = await fetch(requestUrl);
    const searchResults = (await response.json())["items"];

    const matchesPromises: Promise<Link>[] = [];

    for(const searchResult of searchResults) {
      matchesPromises.push(new Promise(async (resolve, _reject) => {
        const videoId = searchResult["id"]["videoId"];
        const videoTitle = searchResult["snippet"]["title"];
        const channelName = searchResult["snippet"]["channelTitle"];
        const details = await this.getDetails(videoId);

        const similarity = this.calculateSimilarity(
          trackMeta,
          videoTitle,
          channelName,
          details.duration,
          preferExtended,
        );

        if (similarity > this.SIMILARITY_THRESHOLD) {
          resolve({
            link: `https://www.youtube.com/watch?v=${videoId}`,
            similarity,
          });
        } else {
          resolve(null);
        }
      }));
    }

    // run all promises concurrently and filter out nulls
    const matches = (await Promise.all(matchesPromises)).filter(a => a !== null);
    return matches;
  }

  private async musicSearch(trackMeta: TrackMetadata, preferExtended: boolean = false): Promise<Link[]> {
    const musicVideoCategoryId = await this.getMusicVideoCategoryId();
    const requestUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    const params = {
      key: YOUTUBE_API_KEY,
      part: "snippet",
      maxResults: 10,
      order: "relevance",
      safeSearch: "none",
      type: "video",
      videoCategoryId: musicVideoCategoryId,
      regionCode: this.REGION_CODE,
      q: this.constructQuery(trackMeta, preferExtended),
    };

    return await this.runYoutubeSearch(requestUrl, params, trackMeta, preferExtended);
  }

  // https://developers.google.com/youtube/v3/docs/search/list
  private async normalSearch(trackMeta: TrackMetadata, preferExtended: boolean = false): Promise<Link[]> {
    const requestUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    const params = {
      key: YOUTUBE_API_KEY,
      part: "snippet",
      maxResults: 10,
      order: "relevance",
      safeSearch: "none",
      type: "video",
      regionCode: this.REGION_CODE,
      q: this.constructQuery(trackMeta, preferExtended),
    };

    return await this.runYoutubeSearch(requestUrl, params, trackMeta, preferExtended);
  }

  public async search(trackMeta: TrackMetadata, preferExtended: boolean = false): Promise<Link[]> {
    const musicMatches = await this.musicSearch(trackMeta, preferExtended);
    const musicMatchesSorted = musicMatches.sort((a, b) => b.similarity - a.similarity);

    if(musicMatchesSorted.length > 0 && musicMatchesSorted[0].similarity > this.AUTO_MATCH_THRESHOLD) {
      return [musicMatchesSorted[0]];
    }

    const normalMatches = await this.normalSearch(trackMeta, preferExtended);

    const matches = musicMatches.concat(normalMatches);
    const sortedAsc = matches.sort((a, b) => a.similarity - b.similarity);
    const noDuplicates = sortedAsc.filter((match, index, self) => {
      for(let i = index + 1; i < self.length; i++) {
        if(self[i].link === match.link) {
          return false;
        }
      }
      return true;
    });

    return noDuplicates.reverse();
  };
}
