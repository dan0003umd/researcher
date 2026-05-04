create type public.profile_role as enum (
  'student',
  'faculty',
  'researcher',
  'coordinator',
  'unverified'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  institutional_email text,
  institutional_verified boolean not null default false,
  role public.profile_role not null default 'unverified',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index profiles_institutional_email_unique
  on public.profiles (lower(institutional_email))
  where institutional_email is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();
