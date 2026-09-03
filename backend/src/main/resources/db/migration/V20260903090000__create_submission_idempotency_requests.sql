create table submission_idempotency_requests
(
    id              bigint       not null auto_increment,
    applicant_id    bigint       not null,
    idempotency_key binary(16)   not null,
    request_hash    char(64)     not null,
    submission_id   binary(16)   null,
    submitted_at    timestamp(6) null,
    created_at      timestamp(6) not null,
    constraint pk_submission_idempotency_requests primary key (id),
    constraint uk_submission_idempotency_applicant_key unique (applicant_id, idempotency_key),
    constraint fk_submission_idempotency_submission
        foreign key (submission_id) references submissions (public_id) on delete cascade
);
