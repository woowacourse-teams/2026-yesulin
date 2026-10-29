-- 고정 QR 주소는 신청과 함께 발급하고, 목적지와 회원 연결은 나중에 운영자가 설정한다.
alter table event_registrations add column business_card_key varchar(36) null;
alter table event_registrations add column business_card_profile_url varchar(2000) null;
alter table event_registrations add column business_card_member_id bigint null;
alter table event_registrations add constraint uk_event_registration_business_card_key unique (business_card_key);
create index idx_event_registration_business_card_member on event_registrations (business_card_member_id);
