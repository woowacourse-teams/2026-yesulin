create table otr_auditions
(
    id          bigint       not null auto_increment,
    public_id   varchar(36)  not null,
    owner_id    bigint       not null,
    otr_id      varchar(30)  not null,
    title       varchar(200) not null,
    deadline    date         not null,
    created_at  timestamp(6) not null default current_timestamp(6),
    constraint pk_otr_auditions primary key (id),
    constraint uk_otr_auditions_public_id unique (public_id),
    constraint uk_otr_auditions_owner_otr_id unique (owner_id, otr_id)
);

create index idx_otr_auditions_owner_created on otr_auditions (owner_id, created_at);

create table otr_audition_roles
(
    otr_audition_id bigint       not null,
    role_order      integer      not null,
    role_name       varchar(100) not null,
    constraint pk_otr_audition_roles primary key (otr_audition_id, role_order),
    constraint fk_otr_audition_roles_audition foreign key (otr_audition_id) references otr_auditions (id)
);
