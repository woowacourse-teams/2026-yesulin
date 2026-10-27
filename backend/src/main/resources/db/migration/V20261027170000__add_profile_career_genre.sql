-- 프로필 경력에 선택 장르를 추가한다. 기존 경력은 미분류(null)로 유지한다.
alter table applicant_profile_careers add column genre varchar(20) null;
