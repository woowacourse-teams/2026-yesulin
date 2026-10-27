-- 기존 body는 대표 이미지 옆 개요로 유지하고 하단 상세 설명·이미지만 선택적으로 추가한다.
alter table events add column detail_body varchar(5000) null;

create table event_detail_images
(
    event_id    bigint       not null,
    image_order integer      not null,
    object_key  varchar(500) not null,
    constraint pk_event_detail_images primary key (event_id, image_order),
    constraint fk_event_detail_images_event foreign key (event_id) references events (id)
);
