alter table submissions
    add column audition_public_id varchar(36) null;

alter table submissions
    add column performance_title varchar(200) null;

alter table submissions
    add column company_name varchar(100) null;

alter table submissions
    add column poster_file_id bigint null;

alter table submissions
    add column poster_owner_id bigint null;

update submissions submission
set audition_public_id = (
        select audition.public_id
        from auditions audition
        where audition.id = submission.audition_id
    ),
    performance_title = (
        select performance.title
        from auditions audition
        join performances performance on performance.id = audition.performance_id
        where audition.id = submission.audition_id
    ),
    company_name = (
        select producer.company_name
        from auditions audition
        join producers producer on producer.member_id = audition.owner_id
        where audition.id = submission.audition_id
    ),
    poster_file_id = (
        select performance.poster_file_id
        from auditions audition
        join performances performance on performance.id = audition.performance_id
        where audition.id = submission.audition_id
    ),
    poster_owner_id = (
        select performance.owner_id
        from auditions audition
        join performances performance on performance.id = audition.performance_id
        where audition.id = submission.audition_id
    );

alter table submissions
    modify column audition_public_id varchar(36) not null;

alter table submissions
    modify column performance_title varchar(200) not null;

alter table submissions
    modify column company_name varchar(100) not null;

alter table submissions
    modify column poster_file_id bigint not null;

alter table submissions
    modify column poster_owner_id bigint not null;

alter table submissions
    add constraint fk_submissions_poster_file_id
        foreign key (poster_file_id) references file_assets (id);

insert into file_references (file_id, reference_type, reference_id)
select submission.poster_file_id, 'SUBMISSION_POSTER', submission.id
from submissions submission
where not exists (
    select 1
    from file_references reference
    where reference.reference_type = 'SUBMISSION_POSTER'
      and reference.reference_id = submission.id
      and reference.file_id = submission.poster_file_id
);
