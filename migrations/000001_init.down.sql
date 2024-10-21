ALTER TABLE Tracks
DROP CONSTRAINT Tracks_metadata_id_fk_Metadatas_id;

ALTER TABLE Tracks
DROP CONSTRAINT Tracks_source_id_fk_Sources_id;

ALTER TABLE Files
DROP CONSTRAINT Files_track_id_fk_Tracks_id;

ALTER TABLE MetadatasArtists
DROP CONSTRAINT MetadatasArtists_metadata_id_fk_Metadatas_id;

ALTER TABLE MetadatasArtists
DROP CONSTRAINT MetadatasArtists_artist_id_fk_Artists_id;

DROP TABLE IF EXISTS Users;

DROP TABLE IF EXISTS Tracks;

DROP TABLE IF EXISTS Files;

DROP TABLE IF EXISTS Metadatas;

DROP TABLE IF EXISTS Artists;

DROP TABLE IF EXISTS MetadatasArtists;

DROP TABLE IF EXISTS Sources;