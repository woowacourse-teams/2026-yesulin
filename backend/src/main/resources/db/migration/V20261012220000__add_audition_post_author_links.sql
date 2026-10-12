alter table audition_posts add column source_author_id varchar(30) null;

create index idx_audition_posts_source_author on audition_posts (source, source_author_id);

create table audition_post_author_links
(
    id                 bigint       not null auto_increment,
    source             varchar(20)  not null,
    source_author_id   varchar(30)  not null,
    source_author_name varchar(100) not null,
    owner_id           bigint       not null,
    created_by         bigint       not null,
    created_at         timestamp(6) not null,
    constraint pk_audition_post_author_links primary key (id),
    constraint uk_audition_post_author_links_source_author unique (source, source_author_id)
);

create index idx_audition_post_author_links_owner on audition_post_author_links (owner_id);
