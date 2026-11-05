CREATE TABLE feedbacks (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    content VARCHAR(1000) NOT NULL,
    contact VARCHAR(100) NOT NULL,
    page_path VARCHAR(300) NOT NULL,
    user_agent VARCHAR(300) NOT NULL,
    member_id BIGINT NULL,
    created_at TIMESTAMP(6) NOT NULL
);
CREATE INDEX idx_feedback_created ON feedbacks (created_at);
