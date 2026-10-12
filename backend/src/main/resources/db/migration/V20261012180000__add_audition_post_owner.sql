alter table audition_posts add column owner_id bigint null;

create index idx_audition_posts_owner on audition_posts (owner_id, id);
