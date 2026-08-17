create table performances
(
    id             bigint       not null auto_increment,
    owner_id       bigint       not null,
    poster_file_id bigint       not null,
    title          varchar(200) not null,
    road_address   varchar(300) not null,
    constraint pk_performances primary key (id),
    constraint fk_performances_poster_file_id foreign key (poster_file_id) references file_assets (id)
);

create index idx_performances_owner_id on performances (owner_id);

create table performance_roles
(
    id             bigint       not null auto_increment,
    performance_id bigint       not null,
    name           varchar(100) not null,
    description    varchar(300) not null,
    role_order     integer      not null,
    constraint pk_performance_roles primary key (id),
    constraint fk_performance_roles_performance_id foreign key (performance_id) references performances (id),
    constraint uk_performance_roles_performance_name unique (performance_id, name)
);
