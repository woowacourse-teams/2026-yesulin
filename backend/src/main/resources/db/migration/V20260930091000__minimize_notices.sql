drop index idx_notices_pending on notices;

alter table notices drop column category;
alter table notices drop column title;
alter table notices drop column pay;
alter table notices drop column deadline;
alter table notices drop column source_url;
alter table notices drop column published_at_text;
alter table notices drop column discovered_at;
alter table notices drop column sent_at;

create index idx_notices_pending on notices (source, status, id);
