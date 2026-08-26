insert into members (id, email, password_hash, type, status, created_at)
values (9001, 'local-producer@yesulin.art', '$2y$10$gz2R508Qr0wWp8RvaosGfeBORTRcdnpkSiiVpQ9V6TnTd56OWBCj.',
        'PRODUCER', 'ACTIVE', '2026-08-01 09:00:00')
on duplicate key update email = values(email), password_hash = values(password_hash), type = values(type),
                        status = values(status);

insert into producers (id, member_id, company_name, phone, created_at)
values (9001, 9001, '예술인 로컬 제작사', '010-1234-5678', '2026-08-01 09:00:00')
on duplicate key update company_name = values(company_name), phone = values(phone);

insert into file_assets
    (id, object_key, owner_id, original_filename, content_type, file_type, size, status)
values (9001, 'public/files/20260801/performance-poster.webp', 9001, 'performance-poster.webp', 'image/webp', 'IMAGE',
        1024, 'READY')
on duplicate key update object_key = values(object_key), owner_id = values(owner_id), original_filename = values(original_filename),
                        content_type = values(content_type), file_type = values(file_type), size = values(size),
                        status = values(status);

insert into performances (id, owner_id, poster_file_id, title, venue_name, road_address, created_at)
values (9001, 9001, 9001, '달빛 아래 우리', '예술인 극장', '서울특별시 종로구 대학로 12',
        '2026-08-01 10:00:00')
on duplicate key update owner_id = values(owner_id), poster_file_id = values(poster_file_id),
                        title = values(title), venue_name = values(venue_name), road_address = values(road_address);

insert into performance_roles (id, performance_id, name, description, role_order)
values (9001, 9001, '주연', '작품을 이끄는 주연 배역', 0),
       (9002, 9001, '조연', '작품의 흐름을 함께 만드는 조연 배역', 1)
on duplicate key update name = values(name), description = values(description), role_order = values(role_order);

insert into file_references (id, file_id, reference_type, reference_id)
values (9001, 9001, 'PERFORMANCE_POSTER', 9001)
on duplicate key update file_id = values(file_id), reference_type = values(reference_type),
                        reference_id = values(reference_id);

insert into auditions
    (id, public_id, performance_id, owner_id, title, performance_start_date, performance_end_date, status,
     created_at, published_at)
values (9001, '90010000-0000-4000-8000-000000000001', 9001, 9001, '2026 하반기 주·조연 배우 모집',
        '2026-10-15', '2026-11-30', 'PUBLISHED', '2026-08-02 10:00:00', '2026-08-02 11:00:00')
on duplicate key update performance_id = values(performance_id), owner_id = values(owner_id), title = values(title),
                        performance_start_date = values(performance_start_date),
                        performance_end_date = values(performance_end_date), status = values(status),
                        published_at = values(published_at);

insert into audition_role_sections (id, audition_id, multiple_role_applications_allowed)
values (9001, 9001, true)
on duplicate key update multiple_role_applications_allowed = values(multiple_role_applications_allowed);

insert into audition_roles
    (id, role_section_id, performance_role_id, recruitment_count, gender_requirement, minimum_age, maximum_age,
     role_order)
values (9001, 9001, 9001, 2, 'ANY', 18, 45, 0),
       (9002, 9001, 9002, 2, 'ANY', 18, 45, 1)
on duplicate key update recruitment_count = values(recruitment_count),
                        gender_requirement = values(gender_requirement), minimum_age = values(minimum_age),
                        maximum_age = values(maximum_age), role_order = values(role_order);

insert into audition_schedules (id, audition_id, recruitment_start_at, recruitment_end_at)
values (9001, 9001, '2026-08-01 00:00:00', '2026-09-30 23:59:59')
on duplicate key update recruitment_start_at = values(recruitment_start_at),
                        recruitment_end_at = values(recruitment_end_at);

insert into audition_screening_stages (id, schedule_id, name, screening_date, notice, stage_order)
values (9001, 9001, '1차 서류', '2026-10-01', '서류 결과는 개별 안내합니다.', 0),
       (9002, 9001, '2차 대면', '2026-10-05', '상세 시간은 합격자에게 안내합니다.', 1)
on duplicate key update name = values(name), screening_date = values(screening_date), notice = values(notice),
                        stage_order = values(stage_order);

insert into audition_forms (id, audition_id)
values (9001, 9001)
on duplicate key update audition_id = values(audition_id);

insert into audition_form_basic_fields (form_id, field)
values (9001, 'NAME'),
       (9001, 'HEIGHT'),
       (9001, 'WEIGHT'),
       (9001, 'BIRTH'),
       (9001, 'GENDER'),
       (9001, 'PHONE'),
       (9001, 'EMAIL'),
       (9001, 'ADDRESS')
on duplicate key update field = values(field);

insert into submissions
    (id, public_id, applicant_id, audition_id, audition_public_id, audition_title, performance_title,
     company_name, poster_file_id, poster_owner_id, submitted_at, basic_information_present,
     applicant_name, height_cm, weight_kg, birth_date, gender, phone, email, address,
     additional_information_present, school, nationality, cover_letter, specialty, hobbies,
     military_service_status, submission_field_snapshot_present, question_answers_present,
     photo_requirement_answers_present, video_requirement_answers_present, age_at_recruitment_deadline)
values (9001, X'90010000000040008000000000000101', 9101, 9001,
        '90010000-0000-4000-8000-000000000001', '2026 하반기 주·조연 배우 모집', '달빛 아래 우리',
        '예술인 로컬 제작사', 9001, 9001, '2026-08-20 14:00:00', true, '김예술', 172, 58, '1998-03-12',
        'FEMALE', '010-1111-2222', 'artist1@example.com', '서울특별시 마포구', true, '예술대학교', '대한민국',
        '성실하게 준비하겠습니다.', '현대무용', '영화 감상', null, true, true, true, true, 28),
       (9002, X'90010000000040008000000000000102', 9102, 9001,
        '90010000-0000-4000-8000-000000000001', '2026 하반기 주·조연 배우 모집', '달빛 아래 우리',
        '예술인 로컬 제작사', 9001, 9001, '2026-08-21 15:00:00', true, '이무대', 180, 72, '1995-07-21',
        'MALE', '010-3333-4444', 'artist2@example.com', '서울특별시 성동구', true, '공연예술대학교', '대한민국',
        '좋은 무대를 만들겠습니다.', '보컬', '러닝', 'COMPLETED', true, true, true, true, 31)
on duplicate key update applicant_id = values(applicant_id), audition_id = values(audition_id),
                        audition_public_id = values(audition_public_id), audition_title = values(audition_title),
                        performance_title = values(performance_title), company_name = values(company_name),
                        poster_file_id = values(poster_file_id), poster_owner_id = values(poster_owner_id),
                        applicant_name = values(applicant_name), submitted_at = values(submitted_at);

insert into submission_selected_roles (submission_id, role_order, audition_role_id, role_name)
values (9001, 0, 9001, '주연'),
       (9001, 1, 9002, '조연'),
       (9002, 0, 9001, '주연')
on duplicate key update audition_role_id = values(audition_role_id), role_name = values(role_name);

insert into screening_reviews
    (id, submission_id, audition_role_id, screening_stage_id, status, other_reason, internal_memo)
values (9001, X'90010000000040008000000000000101', 9001, 9001, 'PASS', '',
        '1차 검토 완료')
on duplicate key update status = values(status), other_reason = values(other_reason),
                        internal_memo = values(internal_memo);
