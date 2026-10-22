-- 방문자별 기록 없이 공고별 누적 숫자만 남긴다. 중복은 브라우저 저장소에서 최대한 제외한다.
alter table audition_posts add column openchat_visit_count bigint not null default 0;
-- 공고 가져오기에 실패해 OTR 경유 링크로 보낸 방문. 나중에 가져오면 공고 통계에서 합산한다.
alter table notices add column openchat_visit_count bigint not null default 0;
