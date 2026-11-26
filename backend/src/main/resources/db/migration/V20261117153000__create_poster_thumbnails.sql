create table poster_thumbnails
(
    source_key varchar(500) not null,
    state varchar(20) not null,
    attempts int not null,
    available_at timestamp(6) not null,
    constraint pk_poster_thumbnails primary key (source_key)
);

create index idx_poster_thumbnails_work on poster_thumbnails (state, available_at);
