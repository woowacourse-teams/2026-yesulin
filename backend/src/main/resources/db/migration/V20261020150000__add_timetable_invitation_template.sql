alter table timetables
    add column invitation_template varchar(1000) not null default '';

alter table timetable_messages
    modify column body varchar(3000) not null;
