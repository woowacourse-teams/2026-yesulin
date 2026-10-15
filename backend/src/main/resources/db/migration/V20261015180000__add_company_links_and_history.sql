-- 공연사 홈페이지 하나 대신 홈페이지·SNS 같은 링크를 최대 3개까지 둔다. 기존 홈페이지는 첫 링크로 옮긴다.
create table company_links
(
    company_id bigint       not null,
    link_order int          not null,
    url        varchar(500) not null,
    constraint pk_company_links primary key (company_id, link_order)
);

insert into company_links (company_id, link_order, url)
select id, 0, homepage
from companies
where homepage is not null;

alter table companies drop column homepage;

alter table companies add column history varchar(2000) null;
