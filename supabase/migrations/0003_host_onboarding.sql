-- host_onboarding.sql

create table if not exists host_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_step text not null default 'intro',
  phone text,
  city text,
  zone text,
  categories_interest text[] not null default '{}',
  terms_accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table host_onboarding enable row level security;

create policy "host_onboarding_select_own"
  on host_onboarding for select using (auth.uid() = user_id);

create policy "host_onboarding_insert_own"
  on host_onboarding for insert with check (auth.uid() = user_id);

create policy "host_onboarding_update_own"
  on host_onboarding for update using (auth.uid() = user_id);

-- columnas nuevas en profiles
alter table profiles add column if not exists is_host boolean not null default false;
alter table profiles add column if not exists host_activated_at timestamptz;

-- trigger de updated_at (reusa tu función si ya existe; si no, créala una vez)
create trigger host_onboarding_set_updated_at
  before update on host_onboarding
  for each row execute function set_updated_at();