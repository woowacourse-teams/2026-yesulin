-- 숨김을 검토 전과 내림으로 나눈다. 공개했다가 숨긴 기록이 있는 공고만 내림으로 두고, 한 번도 공개하지 않은 숨김 공고는 검토 전이다.
update audition_posts
set status = 'PENDING'
where status = 'HIDDEN'
  and not exists (select 1
                  from admin_audit_logs l
                  where l.target_type = 'AUDITION_POST'
                    and l.target_id = audition_posts.id
                    and l.action = 'AUDITION_POST_STATUS_CHANGED'
                    and l.detail = 'PUBLISHED → HIDDEN');

-- 처음 만든 경로를 남긴다. 운영자가 처음 가져온 공고는 감사 기록이 있고, 자동 가져오기는 감사 기록을 남기지 않는다.
alter table audition_posts add column created_via varchar(20) null;

update audition_posts
set created_via = case
    when external_id is null and imported_by is null then 'PRODUCER_WRITE'
    when external_id is null then 'ADMIN_WRITE'
    when exists (select 1
                 from admin_audit_logs l
                 where l.target_type = 'AUDITION_POST'
                   and l.target_id = audition_posts.id
                   and l.action = 'AUDITION_POST_IMPORTED'
                   and l.detail like '%처음 가져옴') then 'ADMIN_IMPORT'
    else 'AUTO_IMPORT'
end;

alter table audition_posts modify column created_via varchar(20) not null;
