create table screening_submission_snapshots
(
    id           bigint        not null auto_increment,
    public_id    varchar(36)   not null,
    audition_id  bigint        not null,
    name         varchar(100)  not null,
    gender       varchar(10)   not null,
    birth_date   date          not null,
    height       integer       null,
    weight       integer       null,
    phone        varchar(30)   not null,
    email        varchar(255)  not null,
    school       varchar(255)  not null,
    submitted_at timestamp(6)  not null,
    cover_letter longtext      not null,
    motivation   longtext      not null,
    constraint pk_screening_submission_snapshots primary key (id),
    constraint uk_screening_submission_snapshots_public_id unique (public_id),
    constraint fk_screening_submission_snapshots_audition_id foreign key (audition_id) references auditions (id)
);

create index idx_screening_submission_snapshots_audition_id on screening_submission_snapshots (audition_id);

create table screening_submission_roles
(
    submission_id   bigint not null,
    audition_role_id bigint not null,
    constraint pk_screening_submission_roles primary key (submission_id, audition_role_id),
    constraint fk_screening_submission_roles_submission_id foreign key (submission_id)
        references screening_submission_snapshots (id),
    constraint fk_screening_submission_roles_audition_role_id foreign key (audition_role_id)
        references audition_roles (id)
);

create index idx_screening_submission_roles_role_id on screening_submission_roles (audition_role_id);

create table screening_submission_careers
(
    submission_id bigint       not null,
    career_order  integer      not null,
    career_year   integer      not null,
    career_title  varchar(200) not null,
    career_part   varchar(100) not null,
    constraint pk_screening_submission_careers primary key (submission_id, career_order),
    constraint fk_screening_submission_careers_submission_id foreign key (submission_id)
        references screening_submission_snapshots (id)
);

create table screening_submission_photos
(
    submission_id bigint       not null,
    photo_order   integer      not null,
    photo_label   varchar(255) not null,
    file_id       bigint       not null,
    constraint pk_screening_submission_photos primary key (submission_id, photo_order),
    constraint fk_screening_submission_photos_submission_id foreign key (submission_id)
        references screening_submission_snapshots (id),
    constraint fk_screening_submission_photos_file_id foreign key (file_id) references file_assets (id)
);

create table screening_submission_videos
(
    submission_id bigint        not null,
    video_order   integer       not null,
    video_label   varchar(255)  not null,
    video_url     varchar(2000) not null,
    constraint pk_screening_submission_videos primary key (submission_id, video_order),
    constraint fk_screening_submission_videos_submission_id foreign key (submission_id)
        references screening_submission_snapshots (id)
);
