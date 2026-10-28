ALTER TABLE events
    ADD COLUMN registration_confirmation_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE events
    ADD COLUMN registration_confirmation_message VARCHAR(2000) NULL;
