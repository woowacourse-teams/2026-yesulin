CREATE TABLE community_likes (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    owner_hash VARCHAR(64) NOT NULL,
    CONSTRAINT uk_community_like UNIQUE (post_id, owner_hash),
    CONSTRAINT fk_community_like_post FOREIGN KEY (post_id) REFERENCES community_entries(id)
);
CREATE INDEX idx_community_author ON community_entries (parent_id, owner_hash, id);
