import { config } from 'dotenv';
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

export const {
  NODE_ENV,
  PORT,
  SECRET_KEY,
  ORIGIN,
  LOG_DIR,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  YOUTUBE_API_KEY,
} = process.env;
