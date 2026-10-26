-- 배우는 프로필 명함 제작을 희망할 때만 이메일·SNS·생년월일·사진·분야·경력을 적는다.
-- 공연사 관계자와 명함을 원하지 않는 배우는 이름·휴대폰만 적으므로 이메일을 비울 수 있게 한다.
alter table event_registrations add column business_card_requested boolean not null default false;
alter table event_registrations modify column email varchar(254) null;

-- 이전 신청서는 배우에게 명함 정보를 모두 받았으므로 사진이 있는 배우 신청은 명함 희망으로 본다.
update event_registrations
set business_card_requested = true
where participant_type = 'ACTOR'
  and photo_key is not null;
