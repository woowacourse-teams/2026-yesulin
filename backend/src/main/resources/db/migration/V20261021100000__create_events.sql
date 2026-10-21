-- 운영자가 쓰는 이벤트 글. 본문은 줄바꿈만 살린 텍스트이고, 메인 배너 노출을 켜면 PC·모바일 배너 이미지로 메인 상단에도 보인다.
-- 이미지는 공개 경로(public/files/events/...)의 저장소 키다. 배너 노출 종료일이 지나면 배너에서만 빠지고 글은 그대로 보인다.
create table events
(
    id                 bigint        not null auto_increment,
    title              varchar(100)  not null,
    summary            varchar(200)  null,
    body               varchar(5000) not null,
    starts_on          date          null,
    ends_on            date          null,
    apply_url          varchar(500)  null,
    apply_label        varchar(30)   null,
    cover_image_key    varchar(500)  null,
    banner_enabled     boolean       not null default false,
    banner_desktop_key varchar(500)  null,
    banner_mobile_key  varchar(500)  null,
    banner_alt         varchar(200)  null,
    banner_ends_on     date          null,
    banner_order       int           not null default 0,
    status             varchar(20)   not null,
    created_by         bigint        not null,
    created_at         timestamp(6)  not null,
    updated_at         timestamp(6)  not null,
    constraint pk_events primary key (id)
);

create index idx_events_status on events (status, id);

-- 브라우저가 저장소로 바로 올린 이벤트 이미지. 운영자가 이벤트를 저장하면서 확정하면 지우고,
-- 하루가 지나도록 확정하지 않은 업로드는 정리 작업이 저장소 객체와 함께 지운다.
create table event_image_uploads
(
    id           bigint       not null auto_increment,
    object_key   varchar(500) not null,
    uploader_id  bigint       not null,
    content_type varchar(100) not null,
    size         bigint       not null,
    created_at   timestamp(6) not null,
    constraint pk_event_image_uploads primary key (id),
    constraint uk_event_image_uploads_object_key unique (object_key)
);

create index idx_event_image_uploads_created on event_image_uploads (created_at, id);
