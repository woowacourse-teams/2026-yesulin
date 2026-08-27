create table email_verifications
(
    token      varchar(64)  not null,
    member_id  bigint       not null,
    email      varchar(320) not null,
    expires_at timestamp(6) not null,
    constraint pk_email_verifications primary key (token),
    constraint uk_email_verifications_member_id unique (member_id),
    constraint fk_email_verifications_member_id foreign key (member_id) references members (id) on delete cascade
);

create index idx_email_verifications_expires_at on email_verifications (expires_at);
