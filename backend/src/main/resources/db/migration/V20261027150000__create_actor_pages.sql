-- 배우 본인의 페이지 아이디·공개 설정·잠금 및 공개 활동 시각을 저장한다.
create table actor_pages
(
    id                      bigint       not null auto_increment,
    public_id               varchar(36)  not null,
    owner_member_id         bigint       not null,
    handle                  varchar(30)  null,
    status                  varchar(20)  not null,
    auto_hidden_reason      varchar(20)  null,
    locked_at               timestamp(6) null,
    lock_reason             varchar(500) null,
    locked_by               bigint       null,
    unlocked_at             timestamp(6) null,
    first_published_at      timestamp(6) null,
    published_at            timestamp(6) null,
    last_public_activity_at timestamp(6) null,
    publish_prompt_shown_at timestamp(6) null,
    created_at              timestamp(6) not null,
    updated_at              timestamp(6) not null,
    constraint pk_actor_pages primary key (id),
    constraint uk_actor_pages_public_id unique (public_id),
    constraint uk_actor_pages_owner_member_id unique (owner_member_id),
    constraint uk_actor_pages_handle unique (handle)
);

-- 설정하지 않은 선택 항목은 도메인에서 비공개로 해석한다.
create table actor_page_field_visibilities
(
    actor_page_id bigint      not null,
    field         varchar(30) not null,
    visibility    varchar(20) not null,
    constraint pk_actor_page_field_visibilities primary key (actor_page_id, field),
    constraint fk_actor_page_field_visibilities_page foreign key (actor_page_id) references actor_pages (id)
);

-- 비공개에서 공개로 전환할 때마다 동의 문서 버전과 동의 시각을 남긴다.
create table actor_page_publish_consents
(
    id               bigint       not null auto_increment,
    actor_page_id    bigint       not null,
    member_id        bigint       not null,
    document_version varchar(100) not null,
    agreed_at        timestamp(6) not null,
    constraint pk_actor_page_publish_consents primary key (id),
    constraint fk_actor_page_publish_consents_page foreign key (actor_page_id) references actor_pages (id)
);

create index idx_actor_page_publish_consents_page on actor_page_publish_consents (actor_page_id);

-- 기존 사진은 비공개, 기존 영상은 공연사 공개 범위로 유지한다.
alter table photo_library_items add column visibility varchar(20) not null default 'PRIVATE';
alter table video_library_items add column visibility varchar(20) not null default 'PRODUCER';
