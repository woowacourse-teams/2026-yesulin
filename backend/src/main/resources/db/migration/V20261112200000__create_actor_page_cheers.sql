-- 로그인한 회원이 배우 페이지에 남긴 응원 글. 아이디가 바뀌어도 유지되도록 페이지 ID를 참조하고, 삭제는 시각만 남긴다.
create table actor_page_cheers
(
    id               bigint       not null auto_increment,
    actor_page_id    bigint       not null,
    author_member_id bigint       not null,
    body             varchar(500) not null,
    created_at       timestamp(6) not null,
    updated_at       timestamp(6) not null,
    deleted_at       timestamp(6) null,
    constraint pk_actor_page_cheers primary key (id),
    constraint fk_actor_page_cheers_page foreign key (actor_page_id) references actor_pages (id)
);

create index idx_actor_page_cheers_page_recent on actor_page_cheers (actor_page_id, id);
create index idx_actor_page_cheers_page_author on actor_page_cheers (actor_page_id, author_member_id);
