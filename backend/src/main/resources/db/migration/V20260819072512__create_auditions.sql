create table auditions
(
    id                     bigint       not null auto_increment,
    performance_id         bigint       not null,
    owner_id               bigint       not null,
    title                  varchar(200) not null,
    performance_start_date date         not null,
    performance_end_date   date         null,
    status                 varchar(20)  not null,
    created_at             timestamp(6) not null default current_timestamp(6),
    published_at           timestamp(6) null,
    constraint pk_auditions primary key (id),
    constraint fk_auditions_performance_id foreign key (performance_id) references performances (id)
);

create index idx_auditions_performance_id on auditions (performance_id);
create index idx_auditions_owner_id on auditions (owner_id);
