CREATE TABLE community_comment_notices (
    comment_id BIGINT PRIMARY KEY,
    recipient_id BIGINT NOT NULL,
    seen BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_community_notice_comment FOREIGN KEY (comment_id) REFERENCES community_entries(id)
);
CREATE INDEX idx_community_notice_inbox ON community_comment_notices(recipient_id, comment_id);
