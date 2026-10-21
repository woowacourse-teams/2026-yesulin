-- 운영자가 적은 공고 알림 카카오톡 오픈채팅방 인원. 공개 조회수 추정치는 공고를 올린 시각의 인원으로 계산하므로
-- 이미 올라온 공고의 조회수가 바뀌지 않도록 고치거나 지우지 않고 새로 적기만 한다. 첫 기록 전 공고는 기록 전 인원(109명)으로 본다.
create table audition_alert_chat_member_counts
(
    id           bigint       not null auto_increment,
    member_count int          not null,
    recorded_by  bigint       not null,
    recorded_at  timestamp(6) not null,
    constraint pk_audition_alert_chat_member_counts primary key (id)
);

create index idx_audition_alert_chat_member_counts_recorded on audition_alert_chat_member_counts (recorded_at, id);
