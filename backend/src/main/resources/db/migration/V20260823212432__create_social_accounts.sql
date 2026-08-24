alter table members modify column email varchar(320) null;

create table social_accounts
(
    id         bigint       not null auto_increment,
    member_id  bigint       not null,
    provider   varchar(20)  not null,
    issuer     varchar(255) not null,
    subject    varchar(255) not null,
    created_at timestamp(6) not null,
    constraint pk_social_accounts primary key (id),
    constraint uk_social_accounts_issuer_subject unique (issuer, subject),
    constraint fk_social_accounts_member_id foreign key (member_id) references members (id)
);

create index idx_social_accounts_member_id on social_accounts (member_id);
