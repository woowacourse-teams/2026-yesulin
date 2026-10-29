-- 공연사가 관심 배우로 저장한 배우 페이지. 운영자가 아이디를 바꿔도 유지되도록 페이지 ID를 참조한다.
create table producer_actor_bookmarks
(
    id                 bigint       not null auto_increment,
    producer_member_id bigint       not null,
    actor_page_id      bigint       not null,
    created_at         timestamp(6) not null,
    constraint pk_producer_actor_bookmarks primary key (id),
    constraint uk_producer_actor_bookmarks_page unique (producer_member_id, actor_page_id),
    constraint fk_producer_actor_bookmarks_page foreign key (actor_page_id) references actor_pages (id)
);

create index idx_producer_actor_bookmarks_recent on producer_actor_bookmarks (producer_member_id, created_at, id);
