create table admin_audit_logs
(
    id              bigint       not null auto_increment,
    actor_member_id bigint       not null,
    action          varchar(40)  not null,
    target_type     varchar(40)  not null,
    target_id       bigint       not null,
    detail          varchar(200) not null,
    created_at      timestamp(6) not null,
    constraint pk_admin_audit_logs primary key (id)
);

create index idx_admin_audit_logs_created_at on admin_audit_logs (created_at);
