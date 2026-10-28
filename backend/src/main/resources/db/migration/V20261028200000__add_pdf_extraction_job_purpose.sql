-- 공연사 PDF 심사와 배우 프로필 가져오기를 같은 추출 흐름으로 처리하되 데이터·권한을 나눈다. 기존 작업은 모두 공연사 심사다.
ALTER TABLE pdf_extraction_jobs ADD COLUMN purpose VARCHAR(20) NOT NULL DEFAULT 'PDF_REVIEW';
ALTER TABLE pdf_extraction_jobs ADD COLUMN owner_type VARCHAR(20) NOT NULL DEFAULT 'PRODUCER';
-- 배우 가져오기는 결과가 나온 뒤 24시간이 지나면 지우고, 하루 1회는 제안 값이 있던 작업만 센다.
ALTER TABLE pdf_extraction_jobs ADD COLUMN finished_at TIMESTAMP(6) NULL;
ALTER TABLE pdf_extraction_jobs ADD COLUMN daily_quota_used BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pdf_extraction_jobs ADD COLUMN deleted_at TIMESTAMP(6) NULL;

CREATE INDEX idx_pdf_extraction_owner_purpose_created ON pdf_extraction_jobs (owner_id, purpose, created_at);
