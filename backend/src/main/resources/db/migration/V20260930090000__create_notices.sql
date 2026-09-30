create table notices (
    id bigint not null auto_increment,
    source varchar(30) not null,
    external_id varchar(100) not null,
    category varchar(100) not null,
    title varchar(1000) not null,
    pay varchar(500) not null,
    deadline varchar(100) not null,
    source_url varchar(2000) not null,
    published_at_text varchar(100) not null,
    status varchar(20) not null,
    discovered_at timestamp(6) not null,
    sent_at timestamp(6),
    constraint pk_notices primary key (id),
    constraint uk_notices_source_external_id unique (source, external_id)
);

create index idx_notices_pending on notices (source, status, discovered_at, id);
