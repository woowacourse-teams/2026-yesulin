drop table screening_round_closures;

create table screening_completions
(
    id               bigint    not null auto_increment,
    audition_role_id bigint    not null,
    completed_at     timestamp not null,
    constraint pk_screening_completions primary key (id),
    constraint fk_screening_completions_role_id foreign key (audition_role_id) references audition_roles (id),
    constraint uk_screening_completions_role_id unique (audition_role_id)
);
