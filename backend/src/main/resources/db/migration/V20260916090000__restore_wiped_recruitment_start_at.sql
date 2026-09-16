-- 공고 일정을 저장하면 게시된 공고의 모집 시작 시각이 지워지는 문제가 있었다.
-- 모집 시작 시각은 게시 시각과 같은 값이므로 게시 시각으로 되돌린다.
update audition_schedules s
set recruitment_start_at = (
    select a.published_at
    from auditions a
    where a.id = s.audition_id
)
where s.recruitment_start_at is null
  and exists (
    select 1
    from auditions a
    where a.id = s.audition_id
      and a.published_at is not null
);
