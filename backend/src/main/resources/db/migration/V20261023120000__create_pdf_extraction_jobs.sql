CREATE TABLE pdf_extraction_jobs (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    upload_expires_at TIMESTAMP(6) NOT NULL,
    uploaded_at TIMESTAMP(6),
    status VARCHAR(20) NOT NULL,
    CONSTRAINT fk_pdf_extraction_owner FOREIGN KEY (owner_id) REFERENCES members (id)
);

CREATE INDEX idx_pdf_extraction_owner_created ON pdf_extraction_jobs (owner_id, created_at);
