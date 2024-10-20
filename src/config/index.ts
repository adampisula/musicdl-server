import { config } from 'dotenv';
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

export const {
  NODE_ENV,
  PORT,
  SECRET_KEY,
  ORIGIN,
  LOG_DIR,
  TEMP_PATH,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  YOUTUBE_API_KEY,
  DATABASE_URL,
  BACKBLAZE_APPLICATION_KEY_ID,
  BACKBLAZE_APPLICATION_KEY,
  BACKBLAZE_BUCKET_ID,
} = process.env;
