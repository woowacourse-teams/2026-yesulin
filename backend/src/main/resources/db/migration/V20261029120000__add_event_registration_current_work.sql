-- 공연사 관계자의 소속과 지금 하는 일을 따로 받는다. 기존 신청은 두 내용을 합친 값이 affiliation에 그대로 남는다.
ALTER TABLE event_registrations ADD COLUMN current_work VARCHAR(500) NULL;
