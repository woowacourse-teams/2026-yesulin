-- 공개된 공연사 화면에서 누구나 보낸 정보 수정 요청. 요청한 정보 전체를 담고 운영자가 확인해 적용하거나 반려한다.
-- 요청자 연락처는 확인 연락에만 쓰고 처리하면 지운다.
create table company_edit_requests
(
    id                         bigint         not null auto_increment,
    company_id                 bigint         not null,
    name                       varchar(100)   not null,
    representative_name        varchar(50)    null,
    representative_name_public boolean        not null default false,
    founded_on                 date           null,
    road_address               varchar(300)   null,
    detail_address             varchar(300)   null,
    zonecode                   varchar(20)    null,
    latitude                   decimal(10, 7) null,
    longitude                  decimal(10, 7) null,
    address_public             boolean        not null default false,
    region                     varchar(50)    null,
    phone                      varchar(30)    null,
    description                varchar(2000)  null,
    history                    varchar(2000)  null,
    changed_fields             varchar(200)   not null,
    reason                     varchar(1000)  not null,
    contact                    varchar(100)   null,
    status                     varchar(20)    not null,
    created_at                 timestamp(6)   not null,
    resolved_by                bigint         null,
    resolved_at                timestamp(6)   null,
    constraint pk_company_edit_requests primary key (id)
);

create index idx_company_edit_requests_status on company_edit_requests (status, id);

create table company_edit_request_links
(
    request_id bigint       not null,
    link_order int          not null,
    url        varchar(500) not null,
    constraint pk_company_edit_request_links primary key (request_id, link_order)
);
