alter table email_verifications
    add column code_hash varchar(100) null;

alter table email_verifications
    add column failed_attempts integer not null default 0;

alter table email_verifications
    add column issued_at timestamp(6) null;
