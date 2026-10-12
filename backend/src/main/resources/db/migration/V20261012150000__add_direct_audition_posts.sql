alter table audition_posts modify column external_id varchar(30) null;

alter table audition_posts modify column source_url varchar(500) null;

create table audition_post_uploads
(
    id                bigint       not null auto_increment,
    object_key        varchar(500) not null,
    uploader_id       bigint       not null,
    kind              varchar(20)  not null,
    original_filename varchar(255) not null,
    content_type      varchar(100) not null,
    size              bigint       not null,
    created_at        timestamp(6) not null,
    constraint pk_audition_post_uploads primary key (id),
    constraint uk_audition_post_uploads_object_key unique (object_key)
);

create index idx_audition_post_uploads_created on audition_post_uploads (created_at);
