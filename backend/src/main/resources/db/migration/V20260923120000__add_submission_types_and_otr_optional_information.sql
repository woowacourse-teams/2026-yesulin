alter table submissions
    add column submission_type varchar(20) not null default 'STANDARD' after applicant_id;

alter table otr_submissions
    add column submission_type varchar(20) not null default 'OTR' after applicant_id;

alter table otr_submissions
    add column additional_information_present boolean not null default true after address;

alter table otr_submissions
    add column education_level varchar(20) null after additional_information_present;

alter table otr_submissions
    add column school varchar(255) null after education_level;

alter table otr_submissions
    add column major varchar(255) null after school;

alter table otr_submissions
    add column nationality varchar(100) null after major;

alter table otr_submissions
    add column cover_letter varchar(2000) null after nationality;

alter table otr_submissions
    add column specialty varchar(255) null after cover_letter;

alter table otr_submissions
    add column hobbies varchar(255) null after specialty;

alter table otr_submissions
    add column military_service_status varchar(20) null after hobbies;

create table otr_submission_links
(
    otr_submission_id bigint       not null,
    link_order        integer      not null,
    url               varchar(255) not null,
    constraint pk_otr_submission_links primary key (otr_submission_id, link_order),
    constraint fk_otr_submission_links_submission foreign key (otr_submission_id) references otr_submissions (id)
);

create table otr_submission_careers
(
    otr_submission_id bigint       not null,
    career_order      integer      not null,
    career_year       integer      not null,
    title             varchar(255) not null,
    role_name         varchar(100) not null,
    constraint pk_otr_submission_careers primary key (otr_submission_id, career_order),
    constraint fk_otr_submission_careers_submission foreign key (otr_submission_id) references otr_submissions (id)
);
