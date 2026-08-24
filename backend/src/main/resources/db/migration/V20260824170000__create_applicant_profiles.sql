create table applicant_profiles
(
    id                      bigint       not null auto_increment,
    owner_id                bigint       not null,
    profile_name            varchar(100) null,
    height_cm               integer      null,
    weight_kg               integer      null,
    birth_date              date         null,
    gender                  varchar(20)  null,
    phone                   varchar(13)  null,
    profile_email           varchar(254) null,
    address                 varchar(100) null,
    school                  varchar(255) null,
    nationality             varchar(100) null,
    cover_letter            varchar(2000) null,
    specialty               varchar(255) null,
    hobbies                 varchar(255) null,
    military_service_status varchar(20)  null,
    created_at              timestamp(6) not null default current_timestamp(6),
    updated_at              timestamp(6) not null default current_timestamp(6),
    constraint pk_applicant_profiles primary key (id),
    constraint uk_applicant_profiles_owner_id unique (owner_id),
    constraint fk_applicant_profiles_owner_id foreign key (owner_id) references members (id)
);

create table applicant_profile_links
(
    applicant_profile_id bigint       not null,
    link_order           integer      not null,
    url                  varchar(255) not null,
    constraint pk_applicant_profile_links primary key (applicant_profile_id, link_order),
    constraint fk_applicant_profile_links_profile_id
        foreign key (applicant_profile_id) references applicant_profiles (id)
);

create table applicant_profile_careers
(
    applicant_profile_id bigint       not null,
    career_order         integer      not null,
    career_year          integer      not null,
    title                varchar(255) not null,
    role_name            varchar(100) not null,
    constraint pk_applicant_profile_careers primary key (applicant_profile_id, career_order),
    constraint fk_applicant_profile_careers_profile_id
        foreign key (applicant_profile_id) references applicant_profiles (id)
);
