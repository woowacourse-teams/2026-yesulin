-- 공연사 대표 사진. 공개 경로(public/files/companies/...)의 저장소 키이고, 없으면 화면이 이름 첫 글자 이미지를 보인다.
alter table companies add column photo_key varchar(500) null;

-- 수정 요청에 함께 보낸 사진. 운영자가 적용하기 전까지 비공개 경로(private/company-photos/...)에 둔다.
alter table company_edit_requests add column photo_key varchar(500) null;

-- 브라우저가 저장소로 바로 올린 공연사 사진. 운영자 저장이나 수정 요청 제출로 확정하면 지우고,
-- 하루가 지나도록 확정하지 않은 업로드는 정리 작업이 저장소 객체와 함께 지운다. 수정 요청의 업로드는 올린 사람이 없다.
create table company_photo_uploads
(
    id           bigint       not null auto_increment,
    object_key   varchar(500) not null,
    uploader_id  bigint       null,
    content_type varchar(100) not null,
    size         bigint       not null,
    created_at   timestamp(6) not null,
    constraint pk_company_photo_uploads primary key (id),
    constraint uk_company_photo_uploads_object_key unique (object_key)
);

create index idx_company_photo_uploads_created on company_photo_uploads (created_at, id);
