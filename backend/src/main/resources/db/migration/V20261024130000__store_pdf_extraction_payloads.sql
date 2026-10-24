CREATE TABLE pdf_extraction_payloads (
    job_id VARCHAR(36) NOT NULL PRIMARY KEY,
    payload_json MEDIUMTEXT NOT NULL,
    payload_sha256 VARCHAR(64) NOT NULL,
    received_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_pdf_extraction_payload_job FOREIGN KEY (job_id) REFERENCES pdf_extraction_jobs (id)
);
