create table members
(
    id            bigint       not null auto_increment,
    email         varchar(320) not null,
    password_hash varchar(60)  null,
    type          varchar(20)  not null,
    created_at    timestamp(6) not null,
    constraint pk_members primary key (id),
    constraint uk_members_email unique (email)
);
