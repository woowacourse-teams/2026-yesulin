ALTER TABLE community_entries ADD COLUMN reply_to_id BIGINT NULL;
ALTER TABLE community_entries ADD CONSTRAINT fk_community_reply_to
    FOREIGN KEY (reply_to_id) REFERENCES community_entries (id);
