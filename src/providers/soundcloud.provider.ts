import { Service } from "typedi";
import { TrackFile, TrackMetadata } from "@interfaces/track.interface";
import { DownloadableMusicProvider } from "@interfaces/provider.interface";
import { Link } from '@/interfaces/links.interface'

@Service()
export class SoundCloudProvider implements DownloadableMusicProvider {
  public isUrlSupported = (url: string): boolean => {
    const re = /^(?:(https?):\/\/)?(?:(?:www|m|on)\.)?(soundcloud\.com|snd\.sc)\/(.*)$/;
    return re.test(url);
  };

  public getMetadata = async (url: string): Promise<TrackMetadata> => {
    return {
      title: "",
      artists: [""],
      isRemix: false,
      isExtended: false,
      duration: 0,
    };
  };

  public download(url: string): Promise<TrackFile> {
    return Promise.resolve({});
  }

  public search(data: any): Promise<Link[]> {
    return Promise.resolve([]);
  }
}
