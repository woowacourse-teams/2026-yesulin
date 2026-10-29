-- 방문자나 개인 명함 식별값 없이 이벤트별 날짜만 기록한다.
create table event_business_card_visits (
    id bigint not null auto_increment,
    event_id bigint not null,
    visited_on date not null,
    constraint pk_event_business_card_visits primary key (id),
    constraint fk_event_business_card_visits_event foreign key (event_id) references events (id) on delete cascade
);
create index idx_event_business_card_visits_date on event_business_card_visits (event_id, visited_on);
