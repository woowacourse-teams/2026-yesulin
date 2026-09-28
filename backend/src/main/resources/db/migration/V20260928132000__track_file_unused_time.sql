alter table file_assets
    add column unreferenced_at timestamp(6) null;

alter table file_assets
    add column deleted_at timestamp(6) null;

-- 이전 READY 파일의 마지막 연결 해제 시각은 알 수 없다. 배포 시점부터만 보수적으로 센다.
update file_assets
set unreferenced_at = current_timestamp(6)
where status = 'READY';

create index idx_file_assets_unreferenced_id on file_assets (unreferenced_at, id);
