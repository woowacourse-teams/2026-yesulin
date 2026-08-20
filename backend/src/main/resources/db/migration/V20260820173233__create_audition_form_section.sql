create table audition_forms
(
    id          bigint not null auto_increment,
    audition_id bigint not null,
    constraint pk_audition_forms primary key (id),
    constraint uk_audition_forms_audition_id unique (audition_id),
    constraint fk_audition_forms_audition_id foreign key (audition_id) references auditions (id)
);

create table audition_form_basic_fields
(
    form_id bigint      not null,
    field   varchar(50) not null,
    constraint pk_audition_form_basic_fields primary key (form_id, field),
    constraint fk_audition_form_basic_fields_form_id foreign key (form_id) references audition_forms (id)
);

create table audition_form_additional_fields
(
    form_id bigint      not null,
    field   varchar(50) not null,
    constraint pk_audition_form_additional_fields primary key (form_id, field),
    constraint fk_audition_form_additional_fields_form_id foreign key (form_id) references audition_forms (id)
);

create table audition_photo_requirements
(
    id                bigint       not null auto_increment,
    form_id           bigint       not null,
    description       varchar(255) not null,
    photo_count       integer      not null,
    requirement_order integer      not null,
    constraint pk_audition_photo_requirements primary key (id),
    constraint fk_audition_photo_requirements_form_id foreign key (form_id) references audition_forms (id)
);

create table audition_video_requirements
(
    id                bigint       not null auto_increment,
    form_id           bigint       not null,
    description       varchar(255) not null,
    requirement_order integer      not null,
    constraint pk_audition_video_requirements primary key (id),
    constraint fk_audition_video_requirements_form_id foreign key (form_id) references audition_forms (id)
);

create table audition_additional_questions
(
    id             bigint       not null auto_increment,
    form_id        bigint       not null,
    question       varchar(255) not null,
    required       boolean      not null,
    question_order integer      not null,
    constraint pk_audition_additional_questions primary key (id),
    constraint fk_audition_additional_questions_form_id foreign key (form_id) references audition_forms (id)
);

create index idx_audition_photo_requirements_form_id on audition_photo_requirements (form_id);
create index idx_audition_video_requirements_form_id on audition_video_requirements (form_id);
create index idx_audition_additional_questions_form_id on audition_additional_questions (form_id);
