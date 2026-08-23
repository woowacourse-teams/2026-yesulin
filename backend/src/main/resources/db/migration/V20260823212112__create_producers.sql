create table producers
(
    id           bigint       not null auto_increment,
    member_id    bigint       not null,
    company_name varchar(100) not null,
    phone        varchar(20)  not null,
    created_at   timestamp(6) not null,
    constraint pk_producers primary key (id),
    constraint uk_producers_member_id unique (member_id),
    constraint fk_producers_member_id foreign key (member_id) references members (id)
);
