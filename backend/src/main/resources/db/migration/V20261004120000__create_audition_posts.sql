create table audition_posts
(
    id               bigint       not null auto_increment,
    source           varchar(20)  not null,
    external_id      varchar(30)  not null,
    source_url       varchar(500) not null,
    category         varchar(50)  not null,
    title            varchar(300) not null,
    pay              varchar(200) not null,
    deadline_text    varchar(50)  not null,
    deadline         date,
    author_name      varchar(100) not null,
    source_posted_at datetime(6),
    body_html        mediumtext   not null,
    status           varchar(20)  not null,
    view_count       bigint       not null default 0,
    imported_by      bigint,
    created_at       timestamp(6) not null,
    updated_at       timestamp(6) not null,
    constraint pk_audition_posts primary key (id),
    constraint uk_audition_posts_source_external_id unique (source, external_id)
);

create index idx_audition_posts_status_posted on audition_posts (status, source_posted_at);

create table audition_post_tags
(
    audition_post_id bigint      not null,
    tag_order        integer     not null,
    tag              varchar(50) not null,
    constraint pk_audition_post_tags primary key (audition_post_id, tag_order),
    constraint fk_audition_post_tags_post foreign key (audition_post_id) references audition_posts (id)
);

create table audition_post_files
(
    audition_post_id  bigint       not null,
    file_order        integer      not null,
    kind              varchar(20)  not null,
    object_key        varchar(500) not null,
    original_filename varchar(255) not null,
    content_type      varchar(100) not null,
    size              bigint       not null,
    constraint pk_audition_post_files primary key (audition_post_id, file_order),
    constraint fk_audition_post_files_post foreign key (audition_post_id) references audition_posts (id)
);
