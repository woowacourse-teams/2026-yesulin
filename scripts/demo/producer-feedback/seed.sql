insert into file_assets
    (id, object_key, owner_id, original_filename, content_type, file_type, size, status)
values
    (980000, 'public/demo/producer-feedback/poster.jpg', 9001, 'poster.jpg', 'image/jpeg', 'IMAGE', 1, 'READY');

insert into performances
    (id, owner_id, poster_file_id, title, venue_name, road_address, detail_address, zonecode,
     latitude, longitude, created_at)
values
    (980000, 9001, 980000, '[DEMO] 달빛 아래 우리', '예술IN 씨어터', '서울특별시 종로구 대학로 12',
     '3층', '03086', 37.5822500, 127.0035800, '2026-08-31 09:00:00');

insert into performance_roles (id, performance_id, name, description, role_order)
values
    (980001, 980000, '서연', '섬세한 감정과 단단한 에너지를 가진 주연 배우', 0),
    (980002, 980000, '지우', '밝고 유연한 움직임을 가진 조연 배우', 1);

insert into file_references (file_id, reference_type, reference_id)
values (980000, 'PERFORMANCE_POSTER', 980000);

insert into auditions
    (id, public_id, performance_id, owner_id, title, performance_start_date, performance_end_date,
     status, created_at, published_at)
values
    (980000, '98000000-0000-4000-8000-000000000001', 980000, 9001,
     '[DEMO] 2026 하반기 주·조연 배우 모집', '2026-11-01', '2026-12-20',
     'PUBLISHED', '2026-08-31 10:00:00', '2026-08-31 11:00:00');

insert into audition_role_sections (id, audition_id, multiple_role_applications_allowed)
values (980000, 980000, true);

insert into audition_roles
    (id, role_section_id, performance_role_id, recruitment_count, gender_requirement,
     minimum_age, maximum_age, role_order)
values
    (980001, 980000, 980001, 4, 'FEMALE', 20, 35, 0),
    (980002, 980000, 980002, 6, 'ANY', 20, 40, 1);

insert into audition_schedules (id, audition_id, recruitment_start_at, recruitment_end_at)
values (980000, 980000, '2026-08-01 00:00:00', '2026-09-30 23:59:59');

insert into audition_screening_stages (id, schedule_id, name, screening_date, notice, stage_order)
values
    (980001, 980000, '1차 서류 심사', '2026-10-03', '지원서와 제출 자료를 검토합니다.', 0),
    (980002, 980000, '2차 대면 오디션', '2026-10-10', '세부 시간은 합격자에게 개별 안내합니다.', 1);

insert into audition_forms (id, audition_id)
values (980000, 980000);

insert into audition_form_basic_fields (form_id, field)
values
    (980000, 'NAME'),
    (980000, 'HEIGHT'),
    (980000, 'WEIGHT'),
    (980000, 'BIRTH'),
    (980000, 'GENDER'),
    (980000, 'PHONE'),
    (980000, 'EMAIL'),
    (980000, 'ADDRESS');

insert into audition_form_additional_fields (form_id, field)
values
    (980000, 'SCHOOL'),
    (980000, 'LINK'),
    (980000, 'NATIONALITY'),
    (980000, 'COVER_LETTER'),
    (980000, 'SPECIALTY'),
    (980000, 'HOBBIES'),
    (980000, 'MILITARY'),
    (980000, 'CAREER');

insert into audition_photo_requirements
    (id, form_id, description, photo_count, requirement_order)
values (980001, 980000, '프로필·전신·연기 사진', 3, 0);

insert into audition_video_requirements
    (id, form_id, description, requirement_order)
values (980001, 980000, '자유 연기 영상', 0);

insert into audition_additional_questions
    (id, form_id, question, required, question_order)
values
    (980001, 980000, '이 배역에 지원한 이유를 알려주세요.', true, 0),
    (980002, 980000, '가능한 연습 요일을 알려주세요.', true, 1);

insert into submissions
    (id, public_id, applicant_id, audition_id, audition_public_id, audition_title, performance_title,
     company_name, poster_file_id, poster_owner_id, submitted_at, basic_information_present,
     applicant_name, height_cm, weight_kg, birth_date, gender, phone, email, address,
     additional_information_present, school, nationality, cover_letter, specialty, hobbies,
     military_service_status, submission_field_snapshot_present, question_answers_present,
     photo_requirement_answers_present, video_requirement_answers_present, age_at_recruitment_deadline)
with recursive demo_numbers(number) as (
    select 1
    union all
    select number + 1 from demo_numbers where number < 233
)
select
    981000 + number,
    unhex(replace(concat('98000000-0000-4000-8000-', lpad(number, 12, '0')), '-', '')),
    981000 + number,
    980000,
    '98000000-0000-4000-8000-000000000001',
    '[DEMO] 2026 하반기 주·조연 배우 모집',
    '[DEMO] 달빛 아래 우리',
    '예술IN 데모 제작사',
    980000,
    9001,
    timestampadd(minute, number * 37, '2026-08-20 09:00:00'),
    true,
    case
        when number = 1 then '김예술'
        else concat(
            elt(mod(number - 1, 10) + 1, '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'),
            elt(mod(floor((number - 1) / 10), 10) + 1, '서', '하', '지', '예', '수', '민', '도', '채', '유', '시'),
            elt(floor((number - 1) / 100) + 1, '연', '린', '우')
        )
    end,
    155 + mod(number * 7, 31),
    45 + mod(number * 5, 36),
    date_sub('2026-09-30', interval (19 + mod(number * 7, 25)) year),
    case when mod(number, 5) in (0, 1, 2) then 'FEMALE' else 'MALE' end,
    concat('010-', lpad(7000 + mod(number, 1000), 4, '0'), '-', lpad(1000 + number, 4, '0')),
    concat('demo.applicant', lpad(number, 3, '0'), '@example.com'),
    elt(mod(number - 1, 8) + 1,
        '서울특별시 마포구', '서울특별시 성동구', '서울특별시 종로구', '서울특별시 강남구',
        '경기도 성남시', '경기도 고양시', '인천광역시 부평구', '부산광역시 수영구'),
    true,
    elt(mod(number - 1, 10) + 1,
        '한국예술종합학교', '동국대학교', '중앙대학교', '서울예술대학교', '성균관대학교',
        '단국대학교', '국민대학교', '경희대학교', '한양대학교', '공연예술아카데미'),
    '대한민국',
    case
        when number = 1 then '인물의 선택이 장면의 흐름을 바꾸는 순간을 섬세하게 표현하고 싶어 지원했습니다.'
        else concat('무대 경험과 ', elt(mod(number - 1, 5) + 1, '보컬', '움직임', '감정 연기', '즉흥 연기', '앙상블'),
                    ' 역량을 살려 작품에 기여하고 싶습니다.')
    end,
    elt(mod(number - 1, 8) + 1, '현대무용', '뮤지컬 보컬', '한국무용', '아크로바틱', '검술', '재즈댄스', '피아노', '영어 연기'),
    elt(mod(number - 1, 6) + 1, '영화 감상', '러닝', '독서', '클라이밍', '사진 촬영', '요가'),
    case
        when mod(number, 5) in (0, 1, 2) then 'NOT_APPLICABLE'
        when mod(number, 2) = 0 then 'COMPLETED'
        else 'NOT_COMPLETED'
    end,
    true,
    true,
    true,
    true,
    19 + mod(number * 7, 25)
from demo_numbers;

insert into submission_basic_fields (submission_id, field_order, field)
select submission.id, fields.field_order, fields.field
from submissions submission
cross join (
    select 0 as field_order, 'NAME' as field
    union all select 1, 'HEIGHT'
    union all select 2, 'WEIGHT'
    union all select 3, 'BIRTH'
    union all select 4, 'GENDER'
    union all select 5, 'PHONE'
    union all select 6, 'EMAIL'
    union all select 7, 'ADDRESS'
) fields
where submission.id between 981001 and 981233;

insert into submission_additional_fields (submission_id, field_order, field)
select submission.id, fields.field_order, fields.field
from submissions submission
cross join (
    select 0 as field_order, 'SCHOOL' as field
    union all select 1, 'LINK'
    union all select 2, 'NATIONALITY'
    union all select 3, 'COVER_LETTER'
    union all select 4, 'SPECIALTY'
    union all select 5, 'HOBBIES'
    union all select 6, 'MILITARY'
    union all select 7, 'CAREER'
) fields
where submission.id between 981001 and 981233;

insert into submission_links (submission_id, link_order, url)
select id, 0, concat('https://example.com/demo-portfolio/', id - 981000)
from submissions
where id between 981001 and 981233;

insert into submission_careers (submission_id, career_order, career_year, title, role_name)
select
    id,
    0,
    2023 + mod(id - 981001, 3),
    elt(mod(id - 981001, 6) + 1, '봄날의 약속', '유리정원', '오래된 편지', '한여름 밤', '우리들의 무대', '별의 노래'),
    elt(mod(id - 981001, 5) + 1, '주연', '조연', '앙상블', '스윙', '단역')
from submissions
where id between 981001 and 981233;

insert into submission_careers (submission_id, career_order, career_year, title, role_name)
values
    (981001, 1, 2024, '푸른 밤의 기록', '서윤'),
    (981001, 2, 2025, '마지막 장면', '하린');

insert into submission_selected_roles (submission_id, role_order, audition_role_id, role_name)
select id, 0, 980001, '서연'
from submissions
where id between 981001 and 981233;

insert into submission_selected_roles (submission_id, role_order, audition_role_id, role_name)
select id, 1, 980002, '지우'
from submissions
where id between 981001 and 981233
  and mod(id - 981000, 4) = 0;

insert into submission_question_answers
    (submission_id, answer_order, question_id, question, answer)
select
    id,
    0,
    980001,
    '이 배역에 지원한 이유를 알려주세요.',
    case
        when id = 981001 then '서연이 두려움을 받아들이고 앞으로 나아가는 변화를 진정성 있게 표현하고 싶습니다.'
        else concat('배역의 ', elt(mod(id, 4) + 1, '섬세함', '단단함', '유연함', '솔직함'), '을 제 경험으로 표현하고 싶습니다.')
    end
from submissions
where id between 981001 and 981233;

insert into submission_question_answers
    (submission_id, answer_order, question_id, question, answer)
select
    id,
    1,
    980002,
    '가능한 연습 요일을 알려주세요.',
    elt(mod(id, 4) + 1, '평일 저녁과 주말 모두 가능합니다.', '월·수·금 저녁 가능합니다.', '화·목 저녁과 주말 가능합니다.', '주말 종일 가능합니다.')
from submissions
where id between 981001 and 981233;

insert into file_references (file_id, reference_type, reference_id)
select 980000, 'SUBMISSION_POSTER', id
from submissions
where id between 981001 and 981233;
