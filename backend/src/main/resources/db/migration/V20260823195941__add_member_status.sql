alter table members add column status varchar(20) null after type;

update members set status = 'ACTIVE' where status is null;

alter table members modify column status varchar(20) not null;
