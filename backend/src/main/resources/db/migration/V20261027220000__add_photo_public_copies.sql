-- 배우 페이지에 보일 공개 사진 사본. 공개 경로(public/files/actor-pages/...)의 저장소 키이고, 공개로 설정한 사진에만 있다.
-- 사진을 비공개로 바꾸거나 지우거나 배우 페이지가 공개에서 내려가면 비우고 저장소 객체를 지운다.
alter table photo_library_items add column public_copy_object_key varchar(500) null;

-- 브라우저가 저장소로 바로 올린 공개 사본. 올린 배우가 같은 사진에 확정하면 지우고,
-- 하루가 지나도록 확정하지 않은 업로드는 정리 작업이 저장소 객체와 함께 지운다.
create table photo_public_copy_uploads
(
    id           bigint       not null auto_increment,
    object_key   varchar(500) not null,
    owner_id     bigint       not null,
    photo_id     bigint       not null,
    content_type varchar(100) not null,
    size         bigint       not null,
    created_at   timestamp(6) not null,
    constraint pk_photo_public_copy_uploads primary key (id),
    constraint uk_photo_public_copy_uploads_object_key unique (object_key)
);

create index idx_photo_public_copy_uploads_created on photo_public_copy_uploads (created_at, id);
