create table otr_submissions
(
    id                           bigint       not null auto_increment,
    otr_audition_id              bigint       not null,
    applicant_id                 bigint       not null,
    selected_role                varchar(100) not null,
    basic_information_present    boolean      not null,
    applicant_name               varchar(100) not null,
    height_cm                    integer      not null,
    weight_kg                    integer      not null,
    birth_date                   date         not null,
    gender                       varchar(20)  not null,
    phone                        varchar(13)  not null,
    email                        varchar(254) not null,
    address                      varchar(100) not null,
    recipient_name               varchar(255) not null,
    privacy_document_version     varchar(100) not null,
    third_party_document_version varchar(100) not null,
    submitted_at                 timestamp(6) not null,
    constraint pk_otr_submissions primary key (id),
    constraint uk_otr_submissions_audition_applicant unique (otr_audition_id, applicant_id),
    constraint fk_otr_submissions_audition foreign key (otr_audition_id) references otr_auditions (id)
);

create table otr_submission_photos
(
    otr_submission_id bigint  not null,
    photo_order       integer not null,
    file_id           bigint  not null,
    constraint pk_otr_submission_photos primary key (otr_submission_id, photo_order),
    constraint fk_otr_submission_photos_submission foreign key (otr_submission_id) references otr_submissions (id),
    constraint fk_otr_submission_photos_file foreign key (file_id) references file_assets (id)
);

create table otr_submission_videos
(
    otr_submission_id bigint       not null,
    video_order       integer      not null,
    video_url         varchar(255) not null,
    constraint pk_otr_submission_videos primary key (otr_submission_id, video_order),
    constraint fk_otr_submission_videos_submission foreign key (otr_submission_id) references otr_submissions (id)
);
