alter table public.student_profiles
  add column if not exists linkedin_url text,
  add column if not exists orcid_url text,
  add column if not exists website_url text;
