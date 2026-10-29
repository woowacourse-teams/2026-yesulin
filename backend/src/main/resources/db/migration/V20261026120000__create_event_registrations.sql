-- 이벤트 상세에서 바로 받는 참가 신청서. 켜면 신청 버튼이 외부 링크 대신 예술in 신청서를 연다.
-- 안내 문구는 신청서 위에 그대로 보여 줄 보증금·계좌 같은 안내다.
alter table events add column registration_enabled boolean not null default false;
alter table events add column registration_notice varchar(2000) null;

-- 로그인 없이 받은 이벤트 참가 신청. 배우는 생년월일과 프로필 사진을, 공연사 관계자는 소속과 하는 일을 받는다.
-- 사진은 비공개 경로(private/event-registration-photos/...)의 저장소 키이고, 운영자만 잠깐 열리는 주소로 본다.
create table event_registrations
(
    id               bigint       not null auto_increment,
    event_id         bigint       not null,
    participant_type varchar(20)  not null,
    name             varchar(50)  not null,
    phone            varchar(20)  not null,
    email            varchar(254) not null,
    sns_handle       varchar(100) null,
    birth_date       date         null,
    photo_key        varchar(500) null,
    affiliation      varchar(500) null,
    no_career        boolean      not null default false,
    other_activity   varchar(50)  null,
    created_at       timestamp(6) not null,
    constraint pk_event_registrations primary key (id),
    constraint uk_event_registrations_phone unique (event_id, phone)
);

create index idx_event_registrations_event on event_registrations (event_id, id);

-- 배우가 고른 활동 분야. 기타를 고르면 직접 적은 분야는 event_registrations.other_activity에 둔다.
create table event_registration_activity_fields
(
    registration_id bigint      not null,
    activity_field  varchar(20) not null,
    constraint pk_event_registration_activity_fields primary key (registration_id, activity_field)
);

-- 배우 경력. 적은 순서대로 한 줄씩 둔다. 신입은 경력 없이 event_registrations.no_career를 켠다.
create table event_registration_careers
(
    registration_id bigint       not null,
    career_order    int          not null,
    performed_month varchar(7)   not null,
    work_title      varchar(100) not null,
    role            varchar(50)  null,
    constraint pk_event_registration_careers primary key (registration_id, career_order)
);

-- 신청자가 저장소로 바로 올린 프로필 사진. 신청을 보내 확정하면 지우고,
-- 하루가 지나도록 확정하지 않은 업로드는 정리 작업이 저장소 객체와 함께 지운다.
create table event_registration_photo_uploads
(
    id           bigint       not null auto_increment,
    object_key   varchar(500) not null,
    content_type varchar(100) not null,
    size         bigint       not null,
    created_at   timestamp(6) not null,
    constraint pk_event_registration_photo_uploads primary key (id),
    constraint uk_event_registration_photo_uploads_object_key unique (object_key)
);

create index idx_event_registration_photo_uploads_created on event_registration_photo_uploads (created_at, id);
