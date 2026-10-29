ALTER TABLE pdf_extraction_jobs ADD COLUMN file_key VARCHAR(1024);
ALTER TABLE pdf_extraction_jobs ADD COLUMN extension VARCHAR(10) NOT NULL DEFAULT 'pdf';
ALTER TABLE pdf_extraction_jobs ADD COLUMN content_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf';
ALTER TABLE pdf_extraction_jobs ADD COLUMN file_type VARCHAR(20) NOT NULL DEFAULT 'PDF';
