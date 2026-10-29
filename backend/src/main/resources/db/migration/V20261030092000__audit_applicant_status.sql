ALTER TABLE pdf_review_entries ADD COLUMN processing_status VARCHAR(20) NOT NULL DEFAULT 'UPLOADING';

UPDATE pdf_review_entries e SET processing_status = 'EXTRACTING'
WHERE EXISTS (SELECT 1 FROM pdf_extraction_jobs j WHERE j.id = e.job_id AND j.status = 'QUEUED');

UPDATE pdf_review_entries e SET processing_status = 'FAILED'
WHERE EXISTS (SELECT 1 FROM pdf_extraction_jobs j WHERE j.id = e.job_id AND j.status = 'FAILED');

UPDATE pdf_review_entries e SET processing_status = 'READY'
WHERE EXISTS (SELECT 1 FROM pdf_extraction_jobs j WHERE j.id = e.job_id AND j.status = 'COMPLETED')
  AND NOT EXISTS (SELECT 1 FROM pdf_ai_jobs a WHERE a.job_id = e.job_id);

UPDATE pdf_review_entries e SET processing_status = 'NEEDS_REVIEW'
WHERE EXISTS (SELECT 1 FROM pdf_extraction_jobs j WHERE j.id = e.job_id AND j.status = 'PARTIAL')
  AND NOT EXISTS (SELECT 1 FROM pdf_ai_jobs a WHERE a.job_id = e.job_id);

UPDATE pdf_review_entries e SET processing_status = 'ENRICHING'
WHERE EXISTS (SELECT 1 FROM pdf_ai_jobs a WHERE a.job_id = e.job_id AND a.status IN ('PENDING', 'RUNNING'));

UPDATE pdf_review_entries e SET processing_status = 'READY'
WHERE EXISTS (SELECT 1 FROM pdf_ai_jobs a WHERE a.job_id = e.job_id
              AND (a.status = 'COMPLETED' OR (a.status = 'SKIPPED' AND a.error_code = 'LEGACY_COMPLETED')));

UPDATE pdf_review_entries e SET processing_status = 'NEEDS_REVIEW'
WHERE EXISTS (SELECT 1 FROM pdf_ai_jobs a WHERE a.job_id = e.job_id
              AND (a.status = 'FAILED'
                   OR (a.status = 'SKIPPED' AND a.error_code <> 'LEGACY_COMPLETED'
                       AND a.error_code <> 'EXTRACTION_FAILED')));

UPDATE pdf_review_entries e SET processing_status = 'FAILED'
WHERE EXISTS (SELECT 1 FROM pdf_ai_jobs a WHERE a.job_id = e.job_id
              AND a.status = 'SKIPPED' AND a.error_code = 'EXTRACTION_FAILED');
