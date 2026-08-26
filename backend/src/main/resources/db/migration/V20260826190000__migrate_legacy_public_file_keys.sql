update file_assets
set object_key = concat('public/', object_key)
where object_key like 'files/%';
