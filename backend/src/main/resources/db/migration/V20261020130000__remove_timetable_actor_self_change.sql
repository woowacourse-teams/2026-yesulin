alter table timetables
    drop column self_change_locked;

alter table timetable_actors
    drop column actor_changed_at;

alter table timetable_actors
    drop column previous_slot_date;

alter table timetable_actors
    drop column previous_slot_start_time;
