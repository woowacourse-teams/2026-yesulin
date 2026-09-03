-- 기존 외래 키가 사용할 일반 인덱스를 먼저 만들어 기존 unique 인덱스를 안전하게 교체한다.
create index idx_screening_completions_role_id on screening_completions (audition_role_id);

alter table screening_completions
    drop index uk_screening_completions_role_id;

alter table screening_completions
    add column screening_stage_id bigint null after audition_role_id;

-- 기존 배역 전체 종료 기록은 당시 모든 차수가 종료된 상태였으므로 모든 차수 종료 기록으로 보존한다.
insert into screening_completions (audition_role_id, screening_stage_id, completed_at)
select completion.audition_role_id, stage.id, completion.completed_at
from screening_completions completion
         join audition_roles role on role.id = completion.audition_role_id
         join audition_role_sections section on section.id = role.role_section_id
         join audition_schedules schedule on schedule.audition_id = section.audition_id
         join audition_screening_stages stage on stage.schedule_id = schedule.id
where completion.screening_stage_id is null;

delete from screening_completions
where screening_stage_id is null;

alter table screening_completions
    modify column screening_stage_id bigint not null;

alter table screening_completions
    add constraint fk_screening_completions_stage_id
        foreign key (screening_stage_id) references audition_screening_stages (id);

alter table screening_completions
    add constraint uk_screening_completions_role_stage unique (audition_role_id, screening_stage_id);
