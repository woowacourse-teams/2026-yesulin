-- 명함을 희망한 배우가 명함 뒷면에 넣을 한 줄 소개. 선택이다.
alter table event_registrations add column intro varchar(40) null;
