CREATE TABLE community_entries (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    parent_id BIGINT NULL,
    title VARCHAR(100) NULL,
    body VARCHAR(5000) NOT NULL,
    owner_hash VARCHAR(64) NOT NULL,
    request_key VARCHAR(36) NOT NULL,
    original_digest VARCHAR(64) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    deleted_at TIMESTAMP(6) NULL,
    comment_count INT NOT NULL DEFAULT 0,
    reported BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uk_community_request UNIQUE (request_key),
    CONSTRAINT fk_community_parent FOREIGN KEY (parent_id) REFERENCES community_entries(id)
);
CREATE INDEX idx_community_list ON community_entries (parent_id, deleted_at, id);

CREATE TABLE community_reports (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    entry_id BIGINT NOT NULL,
    post_id BIGINT NOT NULL,
    reporter_hash VARCHAR(64) NOT NULL,
    request_key VARCHAR(36) NOT NULL,
    reason VARCHAR(30) NOT NULL,
    detail VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    notification BOOLEAN NOT NULL DEFAULT FALSE,
    delivered_at TIMESTAMP(6) NULL,
    next_attempt_at TIMESTAMP(6) NULL,
    attempts INT NOT NULL DEFAULT 0,
    CONSTRAINT uk_community_report_request UNIQUE (request_key),
    CONSTRAINT fk_community_report_entry FOREIGN KEY (entry_id) REFERENCES community_entries(id),
    CONSTRAINT fk_community_report_post FOREIGN KEY (post_id) REFERENCES community_entries(id)
);
CREATE INDEX idx_community_report_pending ON community_reports (notification, delivered_at, next_attempt_at, id);
