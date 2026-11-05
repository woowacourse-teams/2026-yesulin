ALTER TABLE community_entries ADD COLUMN topic VARCHAR(20) DEFAULT 'FREE';

CREATE INDEX idx_community_topic_feed ON community_entries (parent_id, deleted_at, topic, id);
