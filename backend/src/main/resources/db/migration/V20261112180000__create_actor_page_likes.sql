-- 로그인한 회원이 배우 페이지에 누른 좋아요. 아이디가 바뀌어도 유지되도록 페이지 ID를 참조한다.
create table actor_page_likes
(
    id            bigint       not null auto_increment,
    actor_page_id bigint       not null,
    member_id     bigint       not null,
    created_at    timestamp(6) not null,
    constraint pk_actor_page_likes primary key (id),
    constraint uk_actor_page_likes_page_member unique (actor_page_id, member_id),
    constraint fk_actor_page_likes_page foreign key (actor_page_id) references actor_pages (id)
);
