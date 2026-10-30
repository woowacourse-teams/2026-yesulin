ALTER TABLE pdf_extraction_jobs ADD COLUMN source_sha256 VARCHAR(64);
CREATE UNIQUE INDEX uk_pdf_review_source_sha ON pdf_extraction_jobs (review_id, source_sha256);
