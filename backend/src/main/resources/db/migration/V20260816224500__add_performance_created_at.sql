alter table performances
    add column created_at timestamp(6) not null default current_timestamp(6);
