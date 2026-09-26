create table shows
(
    id              bigint         not null auto_increment,
    public_id       varchar(36)    not null,
    title           varchar(200)   not null,
    genre           varchar(20)    not null,
    description     varchar(2000)  not null,
    venue_name      varchar(200)   not null,
    road_address    varchar(300)   not null,
    detail_address  varchar(300)   not null,
    zonecode        varchar(20)    not null,
    latitude        decimal(10, 7) null,
    longitude       decimal(10, 7) null,
    running_minutes integer        not null,
    age_rating      varchar(50)    not null,
    inquiry_phone   varchar(13)    not null,
    poster_file_id  bigint         not null,
    status          varchar(20)    not null,
    created_at      timestamp(6)   not null default current_timestamp(6),
    constraint pk_shows primary key (id),
    constraint uk_shows_public_id unique (public_id)
);

create index idx_shows_status_created on shows (status, created_at);

create table show_images
(
    show_id     bigint  not null,
    image_order integer not null,
    file_id     bigint  not null,
    constraint pk_show_images primary key (show_id, image_order),
    constraint fk_show_images_show foreign key (show_id) references shows (id)
);

create table show_sessions
(
    id         bigint       not null auto_increment,
    show_id    bigint       not null,
    starts_at  timestamp(6) not null,
    capacity   integer      not null,
    created_at timestamp(6) not null default current_timestamp(6),
    constraint pk_show_sessions primary key (id),
    constraint fk_show_sessions_show foreign key (show_id) references shows (id)
);

create index idx_show_sessions_show_starts on show_sessions (show_id, starts_at);

create table reservations
(
    id                       bigint       not null auto_increment,
    code                     varchar(8)   not null,
    session_id               bigint       not null,
    booker_name              varchar(50)  not null,
    booker_phone             varchar(13)  not null,
    ticket_count             integer      not null,
    privacy_document_version varchar(100) not null,
    status                   varchar(20)  not null,
    created_at               timestamp(6) not null default current_timestamp(6),
    canceled_at              timestamp(6) null,
    constraint pk_reservations primary key (id),
    constraint uk_reservations_code unique (code),
    constraint fk_reservations_session foreign key (session_id) references show_sessions (id)
);

create index idx_reservations_session_status on reservations (session_id, status);
create index idx_reservations_session_phone on reservations (session_id, booker_phone);
