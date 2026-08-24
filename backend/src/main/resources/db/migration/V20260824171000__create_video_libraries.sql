create table video_libraries
(
    id         bigint       not null auto_increment,
    owner_id   bigint       not null,
    created_at timestamp(6) not null default current_timestamp(6),
    constraint pk_video_libraries primary key (id),
    constraint uk_video_libraries_owner_id unique (owner_id),
    constraint fk_video_libraries_owner_id foreign key (owner_id) references members (id)
);

create table video_library_items
(
    id               bigint       not null auto_increment,
    video_library_id bigint       not null,
    url              varchar(255) not null,
    youtube_id       varchar(11)  not null,
    display_order    integer      not null,
    created_at       timestamp(6) not null default current_timestamp(6),
    constraint pk_video_library_items primary key (id),
    constraint uk_video_library_items_youtube unique (video_library_id, youtube_id),
    constraint fk_video_library_items_library_id foreign key (video_library_id) references video_libraries (id)
);

create index idx_video_library_items_order on video_library_items (video_library_id, display_order);
