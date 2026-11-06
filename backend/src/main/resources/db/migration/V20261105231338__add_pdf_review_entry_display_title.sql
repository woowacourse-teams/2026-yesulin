ALTER TABLE pdf_review_entries ADD COLUMN display_title VARCHAR(255) NULL;
UPDATE pdf_review_entries SET role_manually_assigned = TRUE;
