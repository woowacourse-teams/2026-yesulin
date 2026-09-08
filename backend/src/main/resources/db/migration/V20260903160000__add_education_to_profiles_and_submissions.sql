alter table applicant_profiles
    add column major varchar(255) null;

alter table applicant_profiles
    add column education_level varchar(20) null;

alter table submissions
    add column major varchar(255) null;

alter table submissions
    add column education_level varchar(20) null;
