create table timetables
(
    id                 bigint        not null auto_increment,
    manage_key         varchar(22)   not null,
    title              varchar(60)   not null,
    organizer_name     varchar(40)   not null,
    organizer_phone    varchar(13)   not null,
    location           varchar(200)  not null,
    guide              varchar(1000) not null,
    slot_minutes       integer       not null,
    slot_capacity      integer       not null,
    status             varchar(20)   not null,
    self_change_locked boolean       not null,
    published_at       timestamp(6)  null,
    created_at         timestamp(6)  not null default current_timestamp(6),
    constraint pk_timetables primary key (id),
    constraint uk_timetables_manage_key unique (manage_key)
);

create table timetable_windows
(
    id           bigint not null auto_increment,
    timetable_id bigint not null,
    window_date  date   not null,
    start_time   time   not null,
    end_time     time   not null,
    constraint pk_timetable_windows primary key (id),
    constraint fk_timetable_windows_timetable foreign key (timetable_id) references timetables (id)
);

create table timetable_actors
(
    id                       bigint       not null auto_increment,
    timetable_id             bigint       not null,
    access_key               varchar(22)  not null,
    name                     varchar(30)  not null,
    phone                    varchar(13)  not null,
    slot_date                date         null,
    slot_start_time          time         null,
    invited_at               timestamp(6) null,
    actor_changed_at         timestamp(6) null,
    previous_slot_date       date         null,
    previous_slot_start_time time         null,
    created_at               timestamp(6) not null default current_timestamp(6),
    constraint pk_timetable_actors primary key (id),
    constraint uk_timetable_actors_access_key unique (access_key),
    constraint uk_timetable_actors_phone unique (timetable_id, phone),
    constraint fk_timetable_actors_timetable foreign key (timetable_id) references timetables (id)
);

create table timetable_requests
(
    id           bigint       not null auto_increment,
    timetable_id bigint       not null,
    actor_id     bigint       not null,
    message      varchar(300) not null,
    status       varchar(20)  not null,
    created_at   timestamp(6) not null default current_timestamp(6),
    resolved_at  timestamp(6) null,
    constraint pk_timetable_requests primary key (id),
    constraint fk_timetable_requests_timetable foreign key (timetable_id) references timetables (id),
    constraint fk_timetable_requests_actor foreign key (actor_id) references timetable_actors (id)
);

create index idx_timetable_requests_timetable_status on timetable_requests (timetable_id, status);
create index idx_timetable_requests_actor_status on timetable_requests (actor_id, status);

create table timetable_messages
(
    id              bigint        not null auto_increment,
    timetable_id    bigint        not null,
    actor_id        bigint        null,
    message_type    varchar(40)   not null,
    recipient_name  varchar(40)   not null,
    recipient_phone varchar(13)   not null,
    body            varchar(1000) not null,
    status          varchar(20)   not null,
    created_at      timestamp(6)  not null default current_timestamp(6),
    sent_at         timestamp(6)  null,
    sent_by         bigint        null,
    constraint pk_timetable_messages primary key (id),
    constraint fk_timetable_messages_timetable foreign key (timetable_id) references timetables (id)
);

create index idx_timetable_messages_status_created on timetable_messages (status, created_at);
create index idx_timetable_messages_timetable_status on timetable_messages (timetable_id, status);
create index idx_timetable_messages_actor_status on timetable_messages (actor_id, status);
