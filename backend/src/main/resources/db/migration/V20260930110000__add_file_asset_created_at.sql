alter table file_assets
    add column created_at timestamp(6) not null default current_timestamp(6);

create index idx_file_assets_created_id on file_assets (created_at, id);
