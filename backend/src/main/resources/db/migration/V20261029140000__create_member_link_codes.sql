-- 코드 원문은 보관하지 않는다. 재발급 시 해시를 교체하고 사용 시각으로 한 번만 소비한다.
create table member_link_codes
(
    member_id bigint not null,
    code_hash varchar(64) not null,
    issued_at timestamp(6) not null,
    expires_at timestamp(6) not null,
    used_at timestamp(6) null,
    constraint pk_member_link_codes primary key (member_id),
    constraint uk_member_link_codes_hash unique (code_hash),
    constraint fk_member_link_codes_member foreign key (member_id) references members (id) on delete cascade
);
