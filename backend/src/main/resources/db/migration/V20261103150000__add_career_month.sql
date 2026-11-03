-- 과거 경력의 월은 알 수 없으므로 null로 보존한다. 신규/수정은 애플리케이션에서 검증한다.
alter table applicant_profile_careers add column career_month integer null;
alter table submission_careers add column career_month integer null;
alter table otr_submission_careers add column career_month integer null;
alter table applicant_profile_careers add constraint ck_profile_career_month check (career_month between 1 and 12);
alter table submission_careers add constraint ck_submission_career_month check (career_month between 1 and 12);
alter table otr_submission_careers add constraint ck_otr_career_month check (career_month between 1 and 12);
