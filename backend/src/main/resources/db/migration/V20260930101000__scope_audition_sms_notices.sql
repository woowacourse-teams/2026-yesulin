ALTER TABLE audition_sms_batches
    ADD COLUMN scope_key VARCHAR(40) NOT NULL DEFAULT 'STANDARD';
ALTER TABLE audition_sms_batches MODIFY COLUMN source_stage_id BIGINT NULL;
CREATE INDEX idx_audition_sms_scope
    ON audition_sms_batches (owner_id, scope_key, role_id, source_round, created_at);

ALTER TABLE audition_sms_drafts
    ADD COLUMN scope_key VARCHAR(40) NOT NULL DEFAULT 'STANDARD';
ALTER TABLE audition_sms_drafts DROP PRIMARY KEY;
ALTER TABLE audition_sms_drafts
    ADD PRIMARY KEY (owner_id, scope_key, role_id, source_round);
