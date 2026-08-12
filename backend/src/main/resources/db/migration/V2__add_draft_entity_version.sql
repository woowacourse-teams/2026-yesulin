ALTER TABLE drafts
    ADD COLUMN entity_version BIGINT NOT NULL DEFAULT 0 AFTER revision;
