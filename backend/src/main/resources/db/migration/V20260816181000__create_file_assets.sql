create table file_assets
(
    id                bigint       not null auto_increment,
    object_key        varchar(500) not null,
    owner_id          bigint       not null,
    original_filename varchar(255) not null,
    content_type      varchar(100) not null,
    file_type         varchar(20)  not null,
    size              bigint       not null,
    status            varchar(20)  not null,
    constraint pk_file_assets primary key (id),
    constraint uk_file_assets_object_key unique (object_key)
);
