-- 공고를 올린 공연사(극단·제작사·기획사)의 공개 정보. 기획사 계정과 따로 두어 계정 없는 공연사도 운영자가 만든다.
-- 대표자 이름과 상세 주소는 개인정보일 수 있어 공개 여부를 따로 저장하고, 기본은 공개하지 않는다.
create table companies
(
    id                         bigint         not null auto_increment,
    name                       varchar(100)   not null,
    representative_name        varchar(50)    null,
    representative_name_public boolean        not null default false,
    homepage                   varchar(500)   null,
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
    source_note                varchar(1000)  null,
    status                     varchar(20)    not null,
    created_by                 bigint         not null,
    created_at                 timestamp(6)   not null,
    updated_at                 timestamp(6)   not null,
    constraint pk_companies primary key (id)
);

alter table audition_posts add column company_id bigint null;

create index idx_audition_posts_company on audition_posts (company_id, id);

-- 원문 작성자(OTR 회원 번호)를 공연사에 묶는 규칙. 같은 작성자가 올린 공고는 한 공연사로 모은다.
create table audition_post_company_links
(
    id                 bigint       not null auto_increment,
    source             varchar(20)  not null,
    source_author_id   varchar(30)  not null,
    source_author_name varchar(100) not null,
    company_id         bigint       not null,
    created_by         bigint       not null,
    created_at         timestamp(6) not null,
    constraint pk_audition_post_company_links primary key (id),
    constraint uk_audition_post_company_links_source_author unique (source, source_author_id)
);

create index idx_audition_post_company_links_company on audition_post_company_links (company_id);
