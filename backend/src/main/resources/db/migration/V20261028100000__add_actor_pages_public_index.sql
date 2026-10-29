-- 배우 목록은 공개 페이지를 공개 활동 시각이 최근인 순(같으면 ID 역순)으로 보여 준다.
create index idx_actor_pages_public_recent on actor_pages (status, last_public_activity_at, id);
