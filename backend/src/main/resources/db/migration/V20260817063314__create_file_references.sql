create table file_references
(
    id             bigint      not null auto_increment,
    file_id        bigint      not null,
    reference_type varchar(50) not null,
    reference_id   bigint      not null,
    reference_slot varchar(50) not null,
    created_at     timestamp(6) not null default current_timestamp(6),
    constraint pk_file_references primary key (id),
    constraint fk_file_references_file_id foreign key (file_id) references file_assets (id) on delete cascade,
    constraint uk_file_references_target unique (reference_type, reference_id, reference_slot)
);

create index idx_file_references_file_id on file_references (file_id);

insert into file_references (file_id, reference_type, reference_id, reference_slot)
select poster_file_id, 'PERFORMANCE', id, 'POSTER'
from performances;
