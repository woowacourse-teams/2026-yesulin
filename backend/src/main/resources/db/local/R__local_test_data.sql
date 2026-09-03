delete from screening_reviews
where audition_role_id in (9001, 9002);

delete from screening_completions
where audition_role_id in (9001, 9002);

delete from submission_consents
where submission_id in (select public_id from submissions where audition_id = 9001);

delete from submission_photo_requirement_answers
where submission_id in (select id from submissions where audition_id = 9001);

delete from submission_video_requirement_answers
where submission_id in (select id from submissions where audition_id = 9001);

delete from submission_question_answers
where submission_id in (select id from submissions where audition_id = 9001);

delete from submission_careers
where submission_id in (select id from submissions where audition_id = 9001);

delete from submission_links
where submission_id in (select id from submissions where audition_id = 9001);

delete from submission_additional_fields
where submission_id in (select id from submissions where audition_id = 9001);

delete from submission_basic_fields
where submission_id in (select id from submissions where audition_id = 9001);

delete from submission_selected_roles
where submission_id in (select id from submissions where audition_id = 9001);

delete from file_references
where (reference_type = 'SUBMISSION_PHOTO'
       and reference_id in (select id from submissions where audition_id = 9001))
   or (reference_type = 'SUBMISSION_POSTER'
       and reference_id in (select id from submissions where audition_id = 9001))
   or (reference_type = 'PERFORMANCE_POSTER' and reference_id = 9001);

delete from submissions where audition_id = 9001;
delete from audition_additional_questions where form_id = 9001;
delete from audition_video_requirements where form_id = 9001;
delete from audition_photo_requirements where form_id = 9001;
delete from audition_form_additional_fields where form_id = 9001;
delete from audition_form_basic_fields where form_id = 9001;
delete from audition_forms where id = 9001;
delete from audition_screening_stages where schedule_id = 9001;
delete from audition_schedules where id = 9001;
delete from audition_roles where id in (9001, 9002);
delete from audition_role_sections where id = 9001;
delete from auditions where id = 9001;
delete from performance_roles where id in (9001, 9002);
delete from performances where id = 9001;
delete from file_assets where id = 9001;

insert into members (id, email, password_hash, type, status, created_at)
values (9001, 'local-producer@yesulin.art', '$2y$12$EjvwrH5comMXfhePpXrijeKtu0EQrOIxXJlpyZg7/Jng5vx0fHuBm',
        'PRODUCER', 'ACTIVE', '2026-08-01 09:00:00')
on duplicate key update email = values(email), password_hash = values(password_hash), type = values(type),
                        status = values(status);

insert into producers (id, member_id, company_name, phone, created_at)
values (9001, 9001, '예술인 로컬 제작사', '010-1234-5678', '2026-08-01 09:00:00')
on duplicate key update company_name = values(company_name), phone = values(phone);
