ALTER TABLE community_entries ADD COLUMN member_id BIGINT NULL;
ALTER TABLE community_entries ADD COLUMN author_mode VARCHAR(20) NOT NULL DEFAULT 'ANONYMOUS';
CREATE INDEX idx_community_member ON community_entries (member_id);
