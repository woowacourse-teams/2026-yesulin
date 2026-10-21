create table shedlock
(
    name       varchar(64)  not null,
    lock_until timestamp(3) not null,
    locked_at  timestamp(3) not null,
    locked_by  varchar(255) not null,
    constraint pk_shedlock primary key (name)
);
