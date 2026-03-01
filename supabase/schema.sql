create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  total_invited integer not null default 1 check (total_invited >= 1),
  attending_count integer not null default 0 check (attending_count >= 0),
  response text check (response in ('yes', 'no')),
  responded_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists guests_id_idx on guests (id);

alter table guests add column if not exists total_invited integer not null default 1;
alter table guests add column if not exists attending_count integer not null default 0;
