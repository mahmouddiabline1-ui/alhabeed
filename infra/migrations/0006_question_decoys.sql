alter table questions add column if not exists decoys jsonb not null default '[]'::jsonb;
alter table questions add constraint questions_decoys_array check (jsonb_typeof(decoys) = 'array') not valid;
alter table questions validate constraint questions_decoys_array;
