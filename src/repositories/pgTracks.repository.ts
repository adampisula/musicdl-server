import pg from "pg";
import { TracksRepository } from "@/interfaces/tracksRepository.interface";
import { Track } from '@/interfaces/track.interface'
import { DATABASE_URL } from '@/config'
import { Service } from 'typedi'

@Service()
export class PgTracksRepository implements TracksRepository {
    private pool: pg.Pool;

    constructor() {
        this.pool = new pg.Pool({
            connectionString: DATABASE_URL,
            max: 5,
            idleTimeoutMillis: 60000,
            connectionTimeoutMillis: 2000,
        });
    }

    private async addArtists(artists: string[]): Promise<number[]> {
        const valuesString = artists.map((_, i) => `($${i + 1})`).join(', ');
        const query = {
            text: `
                INSERT INTO artists
                (name)
                VALUES ${valuesString}
                ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name
                RETURNING id
            `,
            values: artists,
        }
        const { rows } = await this.pool.query(query);
        return rows.map(r => r.id);
    }

    private async addMetadata(args: {
        title: string,
        isRemix: boolean,
        durationSeconds: number,
    }): Promise<number> {
        const { title, isRemix, durationSeconds } = args;
        const query = {
            text: `
                INSERT INTO metadatas
                (title, is_remix, duration_seconds)
                VALUES ($1, $2, $3)
                RETURNING id
            `,
            values: [title, isRemix, durationSeconds]
        }
        const { rows } = await this.pool.query(query);
        return rows[0].id;
    }

    private async linkArtistsToMetadata(args: {
        artists: {
            id: number,
            order: number,
        }[],
        metadataId: number,
    }): Promise<void> {
        const { artists, metadataId } = args;

        const valuesString = artists.map((_, i) => `($${i*3+1}, $${i*3+2}, $${i*3+3})`).join(', ');
        const values = artists.map(a => [metadataId, a.id, a.order]).flat();

        const query = {
            text: `
                INSERT INTO metadatasartists
                (metadata_id_fk, artist_id_fk, artist_order)
                VALUES ${valuesString}
            `,
            values,
        }
        await this.pool.query(query);
    }

    private async addSource(args: {
        spotifyId?: string,
        youtubeId?: string,
        // soundcloudId?: string,
    }): Promise<number> {
        const { spotifyId, youtubeId } = args;
        const query = {
            text: `
                INSERT INTO sources
                (spotify_id, youtube_id)
                VALUES ($1, $2)
                RETURNING id
            `,
            values: [spotifyId, youtubeId]
        }
        const { rows } = await this.pool.query(query);
        return rows[0].id;
    }

    private async addFile(args: {
        trackId: number,
        s3ObjectId: string,
        sha1Checksum: string,
        fileExtension: string,
        size: number,
        createdAt: Date,
        expiresAt: Date,
    }): Promise<number> {
        const { trackId, s3ObjectId, sha1Checksum, fileExtension, size, createdAt, expiresAt } = args;
        const query = {
            text: `
                INSERT INTO files
                (track_id_fk, s3_object_id, sha1_checksum, file_extension, size, created_at, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `,
            values: [trackId, s3ObjectId, sha1Checksum, fileExtension, size, createdAt, expiresAt]
        }
        const { rows } = await this.pool.query(query);
        return rows[0].id;
    }

    async getTrackByProviderId(id: string): Promise<Track> {
        const query = {
            text: `
                SELECT
                DISTINCT ON (f.created_at)
                    f.s3_object_id, f.sha1_checksum, f.file_extension, f.size, f.created_at, f.expires_at
                    m.title, m.is_remix, m.duration_seconds,
                    s.spotify_id, s.youtube_id,
                    array_agg(
                        SELECT a.name
                        FROM artists a
                        WHERE ma.artist_id_fk = a.id
                        ORDER BY ma.artist_order ASC
                    ) AS artists
                FROM tracks t
                INNER JOIN files f ON t.file_id_fk = f.id
                INNER JOIN metadatas m ON t.metadata_id_fk = m.id
                INNER JOIN sources s ON t.source_id_fk = s.id
                INNER JOIN metadatasartists ma ON ma.metadata_id_fk = m.id
                WHERE s.spotify_id = $1 OR s.youtube_id = $1
                ORDER BY f.created_at DESC
            `,
            values: [id]
        }
        const { rows } = await this.pool.query(query);
        return rows[0];
    }

    async addTrack(track: Track): Promise<number> {
        const metadataId = await this.addMetadata({
            title: track.metadata.title,
            isRemix: track.metadata.isRemix,
            durationSeconds: track.metadata.durationSeconds,
        });
        const artistIds = await this.addArtists(track.metadata.artists);
        await this.linkArtistsToMetadata({
            artists: artistIds.map((id, i) => ({ id, order: i })),
            metadataId: metadataId,
        });
        const sourceId = await this.addSource({
            spotifyId: track.source.spotifyId,
            youtubeId: track.source.youtubeId,
            // soundcloudId: track.source.soundcloudId,
        });

        const query = {
            text: `
                INSERT INTO tracks
                (metadata_id_fk, source_id_fk)
                VALUES ($1, $2)
                RETURNING id
            `,
            values: [metadataId, sourceId]
        }
        const { rows } = await this.pool.query(query);
        const trackId = rows[0].id;

        await this.addFile({
            trackId,
            s3ObjectId: track.file.s3ObjectId,
            sha1Checksum: track.file.sha1Checksum,
            fileExtension: track.file.fileExtension,
            size: track.file.size,
            createdAt: track.file.createdAt,
            expiresAt: track.file.expiresAt,
        });

        return trackId;
    }
}