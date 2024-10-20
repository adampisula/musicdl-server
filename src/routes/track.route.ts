import { Router } from 'express';
import { TrackController } from '@controllers/track.controller';
import { Routes } from '@interfaces/routes.interface';

export class TrackRoute implements Routes {
  public path = '/track';
  public router = Router();
  public track = new TrackController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/action`, this.track.determineAction);
    this.router.get(`${this.path}/alternatives`, this.track.getAlternatives);
    this.router.get(`${this.path}/metadata`, this.track.getMetadata);
    this.router.get(`${this.path}/download`, this.track.download);
    this.router.get(`${this.path}/download-url`, this.track.getDownloadUrl);
  }
}
