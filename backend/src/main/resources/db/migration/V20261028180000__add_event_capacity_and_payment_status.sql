ALTER TABLE events ADD COLUMN registration_capacity INT NULL;
ALTER TABLE events ADD COLUMN registration_closed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE event_registrations ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE event_registrations ADD COLUMN payment_confirmed_at TIMESTAMP(6) NULL;
