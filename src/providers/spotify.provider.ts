import { Service } from "typedi";
import { MusicProvider } from "@interfaces/provider.interface";
import { TrackMetadata } from "@interfaces/track.interface";
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from "@config";
import { HttpException } from "@/exceptions/HttpException";
import { logger } from "@/utils/logger";
import { Link } from '@/interfaces/links.interface'

@Service()
export class SpotifyProvider implements MusicProvider {
  private accessToken?: string = null;
  private expiresAt?: Date = null;
  private regex = /https?:\/\/open.spotify.com\/track\/([a-zA-Z0-9]+)/;

  private authenticate = async () => {
    const authUrl = "https://accounts.spotify.com/api/token";
    const authHeader = "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "grant_type": "client_credentials",
      }),
    });

    if (response.status != 200) {
      this.accessToken = null;
      this.expiresAt = null;

      throw new HttpException(500, "failed to refresh Spotify access token");
    }

    const data = await response.json();
    this.accessToken = data["access_token"];

    const expiresAt = new Date(new Date().getTime() + data["expires_in"] * 1000);
    this.expiresAt = expiresAt;

    logger.info("Successfully refreshed Spotify access token");
  };

  public isUrlSupported = (url: string): boolean => {
    // const re = /(https?:\/\/open.spotify.com\/(track|user|artist|album)\/[a-zA-Z0-9]+(\/playlist\/[a-zA-Z0-9]+|)|spotify:(track|user|artist|album):[a-zA-Z0-9]+(:playlist:[a-zA-Z0-9]+|))/;
    return this.regex.test(url);
  };

  public getMetadata = async (url: string): Promise<TrackMetadata> => {
    if (!this.accessToken || (!!this.expiresAt && new Date() > this.expiresAt)) {
      await this.authenticate();
    }

    const matches = url.match(this.regex);
    const id = matches[1];

    const endpoint = `https://api.spotify.com/v1/tracks/${id}`;
    const response = await fetch(endpoint, {
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
      },
    });

    if (response.status != 200) {
      throw new HttpException(response.status, "error fetching track metadata from Spotify");
    }

    const data = await response.json();

    const artists: string[] = data["artists"].map((a: any) => a["name"]);
    const title: string = data["name"];
    const duration: number = Math.floor(data["duration_ms"] / 1000);
    const isRemix: boolean = title.toLowerCase().includes("remix");
    const isExtended: boolean = title.toLowerCase().includes("extended");

    return {
      title,
      artists,
      isRemix,
      isExtended,
      duration,
    };
  };

  public search(track: TrackMetadata, preferExtended: boolean): Promise<Link[]> {
    return Promise.resolve([]);
  };
}
