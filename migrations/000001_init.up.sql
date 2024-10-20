CREATE TABLE
    Users (
        id INTEGER NOT NULL,
        username VARCHAR(64) NOT NULL,
        password TEXT NOT NULL
    );

CREATE TABLE
    Tracks (
        id INTEGER PRIMARY KEY NOT NULL,
        file_id_fk INTEGER NOT NULL,
        metadata_id_fk INTEGER NOT NULL,
        source_id_fk INTEGER NOT NULL
    );

CREATE TABLE
    Files (
        id INTEGER PRIMARY KEY NOT NULL,
        s3_object_id TEXT NOT NULL UNIQUE,
        sha1_checksum TEXT NOT NULL,
        file_extension VARCHAR(16) NOT NULL,
        size INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
    );

CREATE TABLE
    Metadatas (
        id INTEGER PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        is_remix BOOLEAN NOT NULL,
        duration_seconds INTEGER NOT NULL
    );

CREATE TABLE
    Artists (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL
    );

CREATE TABLE
    MetadatasArtists (
        id INTEGER PRIMARY KEY NOT NULL,
        metadata_id_fk INTEGER NOT NULL,
        artist_id_fk INTEGER NOT NULL,
        artist_order INTEGER NOT NULL
    );

CREATE TABLE
    Sources (
        id INTEGER PRIMARY KEY NOT NULL,
        spotify_id TEXT,
        youtube_id TEXT
        -- soundcloud_id TEXT -- add in a future migration, not implemented yet
    );

ALTER TABLE Tracks ADD CONSTRAINT Tracks_file_id_fk_Files_id FOREIGN KEY (file_id_fk) REFERENCES Files (id);

ALTER TABLE Tracks ADD CONSTRAINT Tracks_metadata_id_fk_Metadatas_id FOREIGN KEY (metadata_id_fk) REFERENCES Metadatas (id);

ALTER TABLE Tracks ADD CONSTRAINT Tracks_source_id_fk_Sources_id FOREIGN KEY (source_id_fk) REFERENCES Sources (id);

ALTER TABLE MetadatasArtists ADD CONSTRAINT MetadatasArtists_metadata_id_fk_Metadatas_id FOREIGN KEY (metadata_id_fk) REFERENCES Metadatas (id);

ALTER TABLE MetadatasArtists ADD CONSTRAINT MetadatasArtists_artist_id_fk_Artists_id FOREIGN KEY (artist_id_fk) REFERENCES Artists (id);