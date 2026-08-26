alter table performances add column venue_name varchar(200) null after title;
alter table performances add column detail_address varchar(300) not null default '' after road_address;
alter table performances add column zonecode varchar(20) not null default '' after detail_address;
alter table performances add column latitude decimal(10, 7) null after zonecode;
alter table performances add column longitude decimal(10, 7) null after latitude;

update performances set venue_name = road_address where venue_name is null;

alter table performances modify column venue_name varchar(200) not null;
