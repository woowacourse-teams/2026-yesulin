CREATE TABLE pdf_reviews (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    title VARCHAR(120) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    CONSTRAINT fk_pdf_review_owner FOREIGN KEY (owner_id) REFERENCES members (id)
);

CREATE INDEX idx_pdf_review_owner_created ON pdf_reviews (owner_id, created_at);

CREATE TABLE pdf_review_roles (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    review_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role_order INT NOT NULL,
    CONSTRAINT fk_pdf_review_role_review FOREIGN KEY (review_id) REFERENCES pdf_reviews (id),
    CONSTRAINT uk_pdf_review_role_order UNIQUE (review_id, role_order)
);

CREATE TABLE pdf_review_entries (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    review_id VARCHAR(36) NOT NULL,
    job_id VARCHAR(36) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    applicant_name VARCHAR(100),
    role_id VARCHAR(36),
    match_status VARCHAR(20) NOT NULL,
    match_evidence VARCHAR(1000) NOT NULL,
    memo VARCHAR(2000) NOT NULL,
    decision VARCHAR(20) NOT NULL,
    CONSTRAINT fk_pdf_review_entry_review FOREIGN KEY (review_id) REFERENCES pdf_reviews (id),
    CONSTRAINT fk_pdf_review_entry_job FOREIGN KEY (job_id) REFERENCES pdf_extraction_jobs (id),
    CONSTRAINT fk_pdf_review_entry_role FOREIGN KEY (role_id) REFERENCES pdf_review_roles (id),
    CONSTRAINT uk_pdf_review_entry_job UNIQUE (job_id)
);

CREATE INDEX idx_pdf_review_entry_review ON pdf_review_entries (review_id);
