-- Safely create the enum only if it doesn't already exist
DO $$ BEGIN
  CREATE TYPE public.faculty_sought_experience_level AS ENUM (
    'any', 'beginner', 'intermediate', 'advanced'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

alter table public.faculty_profiles
  add column if not exists desired_experience_level public.faculty_sought_experience_level not null default 'any',
  add column if not exists google_scholar_url text,
  add column if not exists orcid_url text;

alter table public.faculty_profiles
  drop constraint if exists faculty_profiles_bio_max_length,
  add constraint faculty_profiles_bio_max_length check (bio is null or char_length(bio) <= 500),
  drop constraint if exists faculty_profiles_recruiting_message_max_length,
  add constraint faculty_profiles_recruiting_message_max_length check (
    recruiting_message is null or char_length(recruiting_message) <= 300
  );