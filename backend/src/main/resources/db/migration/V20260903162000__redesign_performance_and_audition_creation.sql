-- 공연 기간은 공연이 소유한다. 기존 공고 기간이 모두 같은 공연만 안전하게 이관한다.
alter table performances add column performance_start_date date null after title;
alter table performances add column performance_end_date date null after performance_start_date;

update performances p
set performance_start_date = (
        select min(a.performance_start_date)
        from auditions a
        where a.performance_id = p.id
        having count(distinct a.performance_start_date) = 1
           and count(distinct coalesce(a.performance_end_date, date '9999-12-31')) = 1
    ),
    performance_end_date = (
        select min(a.performance_end_date)
        from auditions a
        where a.performance_id = p.id
        having count(distinct a.performance_start_date) = 1
           and count(distinct coalesce(a.performance_end_date, date '9999-12-31')) = 1
    )
where exists (
    select 1
    from auditions a
    where a.performance_id = p.id
    having count(distinct a.performance_start_date) = 1
       and count(distinct coalesce(a.performance_end_date, date '9999-12-31')) = 1
);

-- 서로 다른 기간을 가진 기존 공연은 null로 남겨 공연사가 직접 확정한다.
alter table performances modify column venue_name varchar(200) null;
alter table performances modify column road_address varchar(300) null;
alter table performances modify column detail_address varchar(300) null;
alter table performances modify column zonecode varchar(20) null;

alter table auditions add column rehearsal_venue_name varchar(200) null after performance_end_date;
alter table auditions add column rehearsal_road_address varchar(300) null after rehearsal_venue_name;
alter table auditions add column rehearsal_detail_address varchar(300) null after rehearsal_road_address;
alter table auditions add column rehearsal_zonecode varchar(20) null after rehearsal_detail_address;
alter table auditions add column rehearsal_latitude decimal(10, 7) null after rehearsal_zonecode;
alter table auditions add column rehearsal_longitude decimal(10, 7) null after rehearsal_latitude;

alter table audition_schedules
    modify column recruitment_start_at timestamp(6) null;

alter table audition_screening_stages add column venue_name varchar(200) null after notice;
alter table audition_screening_stages add column venue_road_address varchar(300) null after venue_name;
alter table audition_screening_stages add column venue_detail_address varchar(300) null after venue_road_address;
alter table audition_screening_stages add column venue_zonecode varchar(20) null after venue_detail_address;
alter table audition_screening_stages add column venue_latitude decimal(10, 7) null after venue_zonecode;
alter table audition_screening_stages add column venue_longitude decimal(10, 7) null after venue_latitude;
