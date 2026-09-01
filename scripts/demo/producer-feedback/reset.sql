delete from screening_reviews
where audition_role_id in (980001, 980002);

delete from screening_completions
where audition_role_id in (980001, 980002);

delete from submission_consents
where submission_id in (
    select public_id
    from submissions
    where audition_id = 980000
);

delete from submission_photo_requirement_answers
where submission_id in (select id from submissions where audition_id = 980000);

delete from submission_video_requirement_answers
where submission_id in (select id from submissions where audition_id = 980000);

delete from submission_question_answers
where submission_id in (select id from submissions where audition_id = 980000);

delete from submission_careers
where submission_id in (select id from submissions where audition_id = 980000);

delete from submission_links
where submission_id in (select id from submissions where audition_id = 980000);

delete from submission_additional_fields
where submission_id in (select id from submissions where audition_id = 980000);

delete from submission_basic_fields
where submission_id in (select id from submissions where audition_id = 980000);

delete from submission_selected_roles
where submission_id in (select id from submissions where audition_id = 980000);

delete from file_references
where (reference_type = 'SUBMISSION_PHOTO'
       and reference_id in (select id from submissions where audition_id = 980000))
   or (reference_type = 'SUBMISSION_POSTER'
       and reference_id in (select id from submissions where audition_id = 980000))
   or (reference_type = 'PERFORMANCE_POSTER' and reference_id = 980000)
   or file_id in (
       select id
       from file_assets
       where object_key like 'private/actor-photos/demo/producer-feedback/%'
   );

delete from submissions
where audition_id = 980000;

delete from audition_additional_questions
where form_id = 980000;

delete from audition_video_requirements
where form_id = 980000;

delete from audition_photo_requirements
where form_id = 980000;

delete from audition_form_additional_fields
where form_id = 980000;

delete from audition_form_basic_fields
where form_id = 980000;

delete from audition_forms
where id = 980000;

delete from audition_screening_stages
where schedule_id = 980000;

delete from audition_schedules
where id = 980000;

delete from audition_roles
where id in (980001, 980002);

delete from audition_role_sections
where id = 980000;

delete from auditions
where id = 980000;

delete from performance_roles
where id in (980001, 980002);

delete from performances
where id = 980000;

delete from file_assets
where id = 980000
   or object_key like 'private/actor-photos/demo/producer-feedback/%'
   or object_key = 'public/demo/producer-feedback/poster.jpg';
