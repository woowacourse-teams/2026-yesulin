create table submissions
(
    id                          bigint       not null auto_increment,
    public_id                   binary(16)   not null,
    applicant_id                bigint       not null,
    audition_id                 bigint       not null,
    audition_title              varchar(200) not null,
    submitted_at                timestamp(6) not null,
    basic_information_present   boolean      not null,
    applicant_name              text         null,
    height_cm                   integer      null,
    weight_kg                   integer      null,
    birth_date                  date         null,
    gender                      varchar(20)  null,
    phone                       varchar(13)  null,
    email                       text         null,
    address                     text         null,
    additional_information_present boolean  not null,
    school                      text         null,
    nationality                 text         null,
    cover_letter                text         null,
    specialty                   text         null,
    hobbies                     text         null,
    military_service_status     varchar(20)  null,
    submission_field_snapshot_present boolean not null,
    question_responses_present  boolean      not null,
    photo_responses_present     boolean      not null,
    video_responses_present     boolean      not null,
    age_at_recruitment_deadline integer      null,
    constraint pk_submissions primary key (id),
    constraint uk_submissions_public_id unique (public_id),
    constraint uk_submissions_applicant_audition unique (applicant_id, audition_id)
);

create index idx_submissions_applicant_submitted_at on submissions (applicant_id, submitted_at);

create table submission_basic_fields
(
    submission_id bigint      not null,
    field_order   integer     not null,
    field         varchar(50) not null,
    constraint pk_submission_basic_fields primary key (submission_id, field_order),
    constraint uk_submission_basic_fields_field unique (submission_id, field),
    constraint fk_submission_basic_fields_submission_id foreign key (submission_id) references submissions (id)
);

create table submission_additional_fields
(
    submission_id bigint      not null,
    field_order   integer     not null,
    field         varchar(50) not null,
    constraint pk_submission_additional_fields primary key (submission_id, field_order),
    constraint uk_submission_additional_fields_field unique (submission_id, field),
    constraint fk_submission_additional_fields_submission_id foreign key (submission_id) references submissions (id)
);

create table submission_links
(
    submission_id bigint        not null,
    link_order    integer       not null,
    url           varchar(2048) not null,
    constraint pk_submission_links primary key (submission_id, link_order),
    constraint fk_submission_links_submission_id foreign key (submission_id) references submissions (id)
);

create table submission_careers
(
    submission_id bigint  not null,
    career_order  integer not null,
    career_year   integer not null,
    title         text    not null,
    role_name     text    not null,
    constraint pk_submission_careers primary key (submission_id, career_order),
    constraint fk_submission_careers_submission_id foreign key (submission_id) references submissions (id)
);

create table submission_selected_roles
(
    submission_id   bigint       not null,
    role_order      integer      not null,
    audition_role_id bigint       not null,
    role_name       varchar(100) not null,
    constraint pk_submission_selected_roles primary key (submission_id, role_order),
    constraint uk_submission_selected_roles_role unique (submission_id, audition_role_id),
    constraint fk_submission_selected_roles_submission_id foreign key (submission_id) references submissions (id)
);

create table submission_question_responses
(
    submission_id bigint        not null,
    response_order integer       not null,
    question_id   bigint        not null,
    question      varchar(255)  not null,
    answer        varchar(2000) not null,
    constraint pk_submission_question_responses primary key (submission_id, response_order),
    constraint uk_submission_question_responses_question unique (submission_id, question_id),
    constraint fk_submission_question_responses_submission_id foreign key (submission_id) references submissions (id)
);

create table submission_photo_responses
(
    submission_id           bigint       not null,
    response_order          integer      not null,
    photo_requirement_id    bigint       not null,
    requirement_description varchar(255) not null,
    file_id                 bigint       not null,
    constraint pk_submission_photo_responses primary key (submission_id, response_order),
    constraint uk_submission_photo_responses_requirement_file unique (submission_id, photo_requirement_id, file_id),
    constraint fk_submission_photo_responses_submission_id foreign key (submission_id) references submissions (id),
    constraint fk_submission_photo_responses_file_id foreign key (file_id) references file_assets (id)
);

create index idx_submission_photo_responses_file_id on submission_photo_responses (file_id);

create table submission_video_responses
(
    submission_id           bigint        not null,
    response_order          integer       not null,
    video_requirement_id    bigint        not null,
    requirement_description varchar(255)  not null,
    url                     varchar(2048) not null,
    constraint pk_submission_video_responses primary key (submission_id, response_order),
    constraint uk_submission_video_responses_requirement unique (submission_id, video_requirement_id),
    constraint fk_submission_video_responses_submission_id foreign key (submission_id) references submissions (id)
);
