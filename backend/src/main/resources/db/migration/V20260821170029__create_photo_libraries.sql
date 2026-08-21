create table photo_libraries
(
    id         bigint       not null auto_increment,
    owner_id   bigint       not null,
    created_at timestamp(6) not null default current_timestamp(6),
    constraint pk_photo_libraries primary key (id),
    constraint uk_photo_libraries_owner_id unique (owner_id)
);

create table photo_library_items
(
    id               bigint       not null auto_increment,
    photo_library_id bigint       not null,
    file_id          bigint       not null,
    display_order    integer      not null,
    created_at       timestamp(6) not null default current_timestamp(6),
    deleted_at       timestamp(6) null,
    constraint pk_photo_library_items primary key (id),
    constraint fk_photo_library_items_library_id foreign key (photo_library_id) references photo_libraries (id),
    constraint fk_photo_library_items_file_id foreign key (file_id) references file_assets (id)
);

create index idx_photo_library_items_active_order
    on photo_library_items (photo_library_id, deleted_at, display_order);

create index idx_photo_library_items_file_id on photo_library_items (file_id);
