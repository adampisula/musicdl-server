import { TrackService } from "@services/track.service";
import { Request, Response, NextFunction } from "express";
import { Container } from "typedi";

export class TrackController {
  public track = Container.get(TrackService);

  public determineAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return res.status(200).json({
        data: this.track.determineAction(req.query.url as string),
      });
    } catch (error) {
      next(error);
    }
  };

  public getMetadata = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return res.status(200).json({
        data: await this.track.getMetadata(req.query.url as string),
      });
    } catch (error) {
      next(error);
    }
  };

  public getAlternatives = async (req: Request, res: Response, next: NextFunction) => {
    const preferExtended = String(req.query.extended).toLowerCase() == "true";

    try {
      return res.status(200).json({
        data: await this.track.getAlternatives(req.query.url as string, preferExtended),
      });
    } catch (error) {
      next(error);
    }
  };
}

