-- 운영자가 등록한 공연은 네이버 폼 같은 외부 페이지에서 예매받는다. 빈 값이면 예술in에서 예매받는 기획사 공연이다.
alter table shows add column external_reservation_url varchar(500) not null default '';

-- 관객이 외부 링크 공연에서 예매하기를 눌러 외부 예매 페이지로 이동한 기록. 개인정보는 남기지 않는다.
create table show_external_reservation_visits
(
    id         bigint       not null auto_increment,
    show_id    bigint       not null,
    visited_at timestamp(6) not null default current_timestamp(6),
    constraint pk_show_external_reservation_visits primary key (id),
    constraint fk_show_external_reservation_visits_show foreign key (show_id) references shows (id)
);

create index idx_show_external_reservation_visits_show on show_external_reservation_visits (show_id);
