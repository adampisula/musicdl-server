import { TrackMetadata } from '@/interfaces/track.interface'
import { getDownloadUrlSchema, fetchSchema, getAlternativesSchema, getMetadataSchema } from '@/utils/validationSchemas'
import { TrackService } from "@services/track.service";
import { Request, Response, NextFunction } from "express";
import { Container } from "typedi";

export class TrackController {
  public track = Container.get(TrackService);

  public getDownloadUrl = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getDownloadUrlSchema.validateAsync(req.query);

      return res.status(200).json({
        data: await this.track.getDownloadUrl(req.query.url as string),
      });
    } catch (error) {
      next(error);
    }
  };

  public getMetadata = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getMetadataSchema.validateAsync(req.query);

      return res.status(200).json({
        data: await this.track.getMetadata(req.query.url as string),
      });
    } catch (error) {
      next(error);
    }
  };

  public getAlternatives = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getAlternativesSchema.validateAsync(req.query);
      const preferExtended = String(req.query.prefer_extended).toLowerCase() === "true";

      return res.status(200).json({
        data: await this.track.getAlternatives(req.query.url as string, preferExtended),
      });
    } catch (error) {
      next(error);
    }
  };

  public fetch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fetchSchema.validateAsync(req.body);

      const { source, metadata } = req.body;

      const passSource = {
        spotifyUrl: source.spotify_url,
        youtubeUrl: source.youtube_url,
      };
      const passMetadata = {
        artists: metadata.artists,
        title: metadata.title,
        isRemix: metadata.is_remix,
        durationSeconds: metadata.duration_seconds,
      };

      return res.status(200).json({
        data: await this.track.fetch(passSource, passMetadata),
      });
    } catch (error) {
      next(error);
    }
  }
}

