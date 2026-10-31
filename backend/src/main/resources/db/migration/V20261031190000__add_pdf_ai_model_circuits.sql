CREATE TABLE pdf_ai_model_circuits (
    model_id VARCHAR(150) PRIMARY KEY,
    state VARCHAR(20) NOT NULL DEFAULT 'CLOSED',
    consecutive_failures INT NOT NULL DEFAULT 0,
    open_count INT NOT NULL DEFAULT 0,
    generation BIGINT NOT NULL DEFAULT 0,
    next_probe_at DATETIME(6) NULL,
    probe_token VARCHAR(36) NULL,
    probe_expires_at DATETIME(6) NULL,
    updated_at DATETIME(6) NOT NULL
);

ALTER TABLE pdf_ai_jobs ADD COLUMN escalation_pending BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX idx_pdf_ai_route_ready ON pdf_ai_jobs (status, escalation_pending, next_attempt_at, created_at);
