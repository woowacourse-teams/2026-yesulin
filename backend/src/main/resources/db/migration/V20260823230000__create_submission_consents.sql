create table submission_consents
(
    id                      bigint       not null auto_increment,
    submission_id           binary(16)   not null,
    applicant_id            bigint       not null,
    consent_type            varchar(50)  not null,
    document_version        varchar(100) not null,
    recipient_name_snapshot varchar(255) null,
    agreed_at               timestamp(6) not null,
    constraint pk_submission_consents primary key (id),
    constraint uk_submission_consents_submission_type unique (submission_id, consent_type),
    constraint fk_submission_consents_submission_id
        foreign key (submission_id) references submissions (public_id)
);

create index idx_submission_consents_applicant_agreed_at
    on submission_consents (applicant_id, agreed_at);
