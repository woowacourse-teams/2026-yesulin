create table screening_reviews
(
    id                 bigint        not null auto_increment,
    application_id     binary(16)    not null,
    audition_role_id   bigint        not null,
    screening_stage_id bigint        not null,
    status             varchar(20)   not null,
    other_reason       varchar(255)  not null,
    internal_memo      varchar(2000) not null,
    constraint pk_screening_reviews primary key (id),
    constraint fk_screening_reviews_audition_role_id foreign key (audition_role_id) references audition_roles (id),
    constraint fk_screening_reviews_screening_stage_id foreign key (screening_stage_id) references audition_screening_stages (id),
    constraint uk_screening_reviews_application_role_stage unique (application_id, audition_role_id, screening_stage_id)
);

create index idx_screening_reviews_role_stage on screening_reviews (audition_role_id, screening_stage_id);
create index idx_screening_reviews_application_id on screening_reviews (application_id);
