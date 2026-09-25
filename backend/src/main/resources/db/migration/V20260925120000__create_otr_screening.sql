alter table otr_submissions add column public_id varchar(36) null;
update otr_submissions set public_id = uuid();
alter table otr_submissions modify column public_id varchar(36) not null;
alter table otr_submissions add constraint uk_otr_submissions_public_id unique (public_id);

create table otr_screening_reviews
(
    id                 bigint       not null auto_increment,
    otr_audition_id    bigint       not null,
    otr_submission_id  bigint       not null,
    role_order         integer      not null,
    status             varchar(20)  not null,
    other_reason       varchar(255) not null,
    internal_memo      varchar(2000) not null,
    constraint pk_otr_screening_reviews primary key (id),
    constraint uk_otr_screening_reviews_submission_role unique (otr_submission_id, role_order),
    constraint fk_otr_screening_reviews_audition foreign key (otr_audition_id) references otr_auditions (id),
    constraint fk_otr_screening_reviews_submission foreign key (otr_submission_id) references otr_submissions (id)
);

create table otr_screening_completions
(
    id                 bigint       not null auto_increment,
    otr_audition_id    bigint       not null,
    role_order         integer      not null,
    completed_at       timestamp(6) not null,
    constraint pk_otr_screening_completions primary key (id),
    constraint uk_otr_screening_completions_audition_role unique (otr_audition_id, role_order),
    constraint fk_otr_screening_completions_audition foreign key (otr_audition_id) references otr_auditions (id)
);
