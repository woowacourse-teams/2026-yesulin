alter table timetable_actors
    add column attendance varchar(20) not null default 'UNANSWERED';

alter table timetable_actors
    add column attendance_answered_at timestamp(6) null;
