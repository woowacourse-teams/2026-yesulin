create table audition_role_sections
(
    id                                 bigint  not null auto_increment,
    audition_id                        bigint  not null,
    multiple_role_applications_allowed boolean not null,
    constraint pk_audition_role_sections primary key (id),
    constraint uk_audition_role_sections_audition_id unique (audition_id),
    constraint fk_audition_role_sections_audition_id foreign key (audition_id) references auditions (id)
);

create table audition_roles
(
    id                  bigint      not null auto_increment,
    role_section_id     bigint      not null,
    performance_role_id bigint      not null,
    recruitment_count   integer     not null,
    gender_requirement  varchar(10) not null,
    minimum_age         integer     not null,
    maximum_age         integer     not null,
    role_order          integer     not null,
    constraint pk_audition_roles primary key (id),
    constraint fk_audition_roles_section_id foreign key (role_section_id) references audition_role_sections (id),
    constraint fk_audition_roles_performance_role_id foreign key (performance_role_id) references performance_roles (id),
    constraint uk_audition_roles_section_performance_role unique (role_section_id, performance_role_id)
);

create index idx_audition_roles_section_id on audition_roles (role_section_id);
