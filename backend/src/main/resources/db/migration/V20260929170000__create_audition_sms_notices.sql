CREATE TABLE audition_sms_lock (id BIGINT PRIMARY KEY);
INSERT INTO audition_sms_lock (id) VALUES (1);

CREATE TABLE audition_sms_daily_usage (
    usage_day DATE PRIMARY KEY,
    reserved_count INT NOT NULL
);

CREATE TABLE audition_sms_batches (
    id VARCHAR(36) PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    source_round INT NOT NULL,
    source_stage_id BIGINT NOT NULL,
    target_stage_id BIGINT NULL,
    idempotency_key VARCHAR(36) NOT NULL,
    fingerprint VARCHAR(64) NOT NULL,
    sender VARCHAR(16) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    retry_of VARCHAR(36) NULL,
    estimated_cost DECIMAL(14, 4) NOT NULL,
    recipient_count INT NOT NULL,
    UNIQUE KEY uk_sms_owner_key (owner_id, idempotency_key),
    INDEX idx_sms_role_round (owner_id, role_id, source_round, created_at)
);

CREATE TABLE audition_sms_deliveries (
    id VARCHAR(36) PRIMARY KEY,
    batch_id VARCHAR(36) NOT NULL,
    submission_id VARCHAR(36) NOT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    phone VARCHAR(16) NOT NULL,
    appointment DATETIME NOT NULL,
    body TEXT NOT NULL,
    message_type VARCHAR(3) NOT NULL,
    price DECIMAL(14, 4) NOT NULL,
    status VARCHAR(20) NOT NULL,
    provider_id VARCHAR(40) NULL,
    result_code VARCHAR(80) NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    lookup_count INT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_sms_batch_submission (batch_id, submission_id),
    INDEX idx_sms_delivery_status (status, updated_at),
    INDEX idx_sms_submission (submission_id),
    CONSTRAINT fk_sms_delivery_batch FOREIGN KEY (batch_id) REFERENCES audition_sms_batches(id)
);

CREATE TABLE audition_sms_drafts (
    owner_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    source_round INT NOT NULL,
    version BIGINT NOT NULL,
    payload TEXT NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (owner_id, role_id, source_round)
);
