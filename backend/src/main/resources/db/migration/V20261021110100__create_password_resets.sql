create table password_resets
(
    token      varchar(64)  not null,
    member_id  bigint       not null,
    email      varchar(320) not null,
    expires_at timestamp(6) not null,
    constraint pk_password_resets primary key (token),
    constraint uk_password_resets_member_id unique (member_id),
    constraint fk_password_resets_member_id foreign key (member_id) references members (id) on delete cascade
);

create index idx_password_resets_expires_at on password_resets (expires_at);
