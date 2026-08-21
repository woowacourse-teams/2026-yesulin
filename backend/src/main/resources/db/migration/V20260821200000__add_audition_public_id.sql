alter table auditions
    add column public_id varchar(36) not null;

alter table auditions
    add constraint uk_auditions_public_id unique (public_id);
