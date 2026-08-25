create table screening_round_closures
(
    id                 bigint    not null auto_increment,
    audition_role_id   bigint    not null,
    screening_stage_id bigint    not null,
    closed_at          timestamp not null,
    constraint pk_screening_round_closures primary key (id),
    constraint fk_screening_round_closures_role_id foreign key (audition_role_id) references audition_roles (id),
    constraint fk_screening_round_closures_stage_id foreign key (screening_stage_id) references audition_screening_stages (id),
    constraint uk_screening_round_closures_role_stage unique (audition_role_id, screening_stage_id)
);

create index idx_screening_round_closures_role_id on screening_round_closures (audition_role_id);

update screening_reviews set status = 'ETC', other_reason = '기타' where status = 'ABSENT';
