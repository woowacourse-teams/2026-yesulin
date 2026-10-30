CREATE TABLE pdf_ai_jobs (
    job_id VARCHAR(36) NOT NULL PRIMARY KEY,
    review_id VARCHAR(36),
    owner_id BIGINT NOT NULL,
    roles_json TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    attempts INT NOT NULL,
    next_attempt_at TIMESTAMP(6) NOT NULL,
    lease_expires_at TIMESTAMP(6),
    lease_token VARCHAR(36),
    provider VARCHAR(20) NOT NULL,
    model_id VARCHAR(150) NOT NULL,
    prompt_version VARCHAR(60) NOT NULL,
    error_code VARCHAR(60),
    result_json MEDIUMTEXT,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_pdf_ai_job FOREIGN KEY (job_id) REFERENCES pdf_extraction_jobs (id),
    CONSTRAINT fk_pdf_ai_review FOREIGN KEY (review_id) REFERENCES pdf_reviews (id)
);
CREATE INDEX idx_pdf_ai_ready ON pdf_ai_jobs (status, next_attempt_at, created_at);
CREATE INDEX idx_pdf_ai_lease ON pdf_ai_jobs (status, lease_expires_at);
CREATE INDEX idx_pdf_ai_review_status ON pdf_ai_jobs (review_id, status);

CREATE TABLE pdf_ai_worker_gate (
    id INT NOT NULL PRIMARY KEY,
    next_request_at TIMESTAMP(6) NOT NULL
);
INSERT INTO pdf_ai_worker_gate (id, next_request_at) VALUES (1, '2000-01-01 00:00:00');
