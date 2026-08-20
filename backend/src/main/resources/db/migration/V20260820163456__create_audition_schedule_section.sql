create table audition_schedules
(
    id                   bigint       not null auto_increment,
    audition_id          bigint       not null,
    recruitment_start_at timestamp(6) not null,
    recruitment_end_at   timestamp(6) not null,
    constraint pk_audition_schedules primary key (id),
    constraint uk_audition_schedules_audition_id unique (audition_id),
    constraint fk_audition_schedules_audition_id foreign key (audition_id) references auditions (id)
);

create table audition_screening_stages
(
    id             bigint       not null auto_increment,
    schedule_id    bigint       not null,
    name           varchar(100) not null,
    screening_date date         not null,
    notice         varchar(100) not null,
    stage_order    integer      not null,
    constraint pk_audition_screening_stages primary key (id),
    constraint fk_audition_screening_stages_schedule_id foreign key (schedule_id) references audition_schedules (id)
);

create index idx_audition_screening_stages_schedule_id on audition_screening_stages (schedule_id);
