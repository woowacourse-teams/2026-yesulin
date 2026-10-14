-- 공개 상태·분야별 전체/모집 중 건수를 인덱스만 읽어서 집계할 수 있게 한다.
-- 기존 (status, source_posted_at) 인덱스는 목록 정렬·페이징에 계속 사용한다.
create index idx_audition_posts_status_category_deadline on audition_posts (status, category, deadline);
