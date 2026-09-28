alter table shows add column directions_note varchar(1000) not null default '';
alter table shows add column remaining_seats_visible boolean not null default true;

create table show_links
(
    show_id    bigint       not null,
    link_order integer      not null,
    label      varchar(30)  not null,
    url        varchar(500) not null,
    constraint pk_show_links primary key (show_id, link_order),
    constraint fk_show_links_show foreign key (show_id) references shows (id)
);
