-- 참가 신청서에서 배우의 프로필 명함 제작 희망을 받는 마감 시각. 비우면 신청 기간 내내 받는다.
-- 참가 신청은 이벤트 종료일까지 받고, 이 시각이 지나면 명함 제작만 닫는다.
alter table events add column business_card_closes_at timestamp(6) null;
