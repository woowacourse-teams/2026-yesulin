-- 공연마다 주최 이름을 바꿔 쓸 수 있게 한다. 빈 값이면 기획사 계정의 회사명을 보여 준다.
alter table shows add column host_name varchar(50) not null default '';

create table show_guides
(
    show_id     bigint        not null,
    guide_order integer       not null,
    title       varchar(30)   not null,
    content     varchar(1000) not null,
    constraint pk_show_guides primary key (show_id, guide_order),
    constraint fk_show_guides_show foreign key (show_id) references shows (id)
);

-- 하나뿐이던 오시는 길 추가 안내는 관객 화면에 보이던 제목 그대로 첫 추가 안내로 옮긴다.
insert into show_guides (show_id, guide_order, title, content)
select id, 0, '추가 안내', directions_note
from shows
where directions_note <> '';

alter table shows drop column directions_note;

-- 기획사가 관객별로 남기는 메모. 관객에게는 보여 주지 않는다.
alter table reservations add column memo varchar(300) not null default '';
