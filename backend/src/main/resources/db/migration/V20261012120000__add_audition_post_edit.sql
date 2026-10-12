alter table audition_posts
    add column edited_at timestamp(6) null;

alter table audition_posts
    add column edited_by bigint null;
