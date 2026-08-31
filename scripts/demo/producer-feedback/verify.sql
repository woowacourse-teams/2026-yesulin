select
    performance.id as performance_id,
    performance.title as performance_title,
    audition.id as audition_id,
    audition.public_id as audition_public_id,
    audition.title as audition_title
from performances performance
join auditions audition on audition.performance_id = performance.id
where performance.id = 980000;

select
    role.id as role_id,
    performance_role.name as role_name,
    count(distinct selected_role.submission_id) as applicant_count
from audition_roles role
join performance_roles performance_role on performance_role.id = role.performance_role_id
left join submission_selected_roles selected_role on selected_role.audition_role_id = role.id
where role.id in (980001, 980002)
group by role.id, performance_role.name
order by role.id;

select
    coalesce(review.status, 'PENDING') as screening_status,
    count(*) as applicant_count
from submissions submission
left join screening_reviews review
    on review.submission_id = submission.public_id
   and review.audition_role_id = 980001
   and review.screening_stage_id = 980001
where submission.id between 981001 and 981200
group by coalesce(review.status, 'PENDING')
order by screening_status;

select
    count(distinct photo.submission_id) as linked_photo_count,
    count(distinct submission.id) - count(distinct photo.submission_id) as missing_photo_count
from submissions submission
left join submission_photo_requirement_answers photo on photo.submission_id = submission.id
where submission.audition_id = 980000;

select
    submission.id as representative_submission_id,
    submission.applicant_name,
    count(distinct career.career_order) as career_count,
    count(distinct question.answer_order) as question_count,
    count(distinct photo.answer_order) as photo_count,
    count(distinct video.answer_order) as video_count
from submissions submission
left join submission_careers career on career.submission_id = submission.id
left join submission_question_answers question on question.submission_id = submission.id
left join submission_photo_requirement_answers photo on photo.submission_id = submission.id
left join submission_video_requirement_answers video on video.submission_id = submission.id
where submission.id = 981001
group by submission.id, submission.applicant_name;
