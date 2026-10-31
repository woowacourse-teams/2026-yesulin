alter table timetables modify manage_key varchar(22) null;
alter table timetables add column owner_id bigint null;
alter table timetables add column creation_key varchar(36) null;
alter table timetables add constraint uk_timetables_owner_creation unique (owner_id, creation_key);

alter table timetable_actors modify phone varchar(13) null;
alter table timetable_actors add column email varchar(254) not null default '';
alter table timetable_actors add column source_review_id varchar(36) null;
alter table timetable_actors add column source_applicant_id varchar(36) null;
alter table timetable_actors add column role_name varchar(100) not null default '';
alter table timetable_actors add constraint uk_timetable_actors_source unique (timetable_id, source_applicant_id);
