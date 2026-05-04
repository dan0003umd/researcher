create table public.research_interests (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null,
  parent_id bigint references public.research_interests(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (name, category)
);

create table public.skills (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (name, category)
);

create type public.profile_availability as enum (
  'actively_looking',
  'open',
  'not_available'
);

create type public.profile_experience_level as enum (
  'beginner',
  'intermediate',
  'advanced'
);

create type public.collaboration_type as enum (
  'research_assistant',
  'co_author',
  'project_lead'
);

create type public.profile_skill_proficiency as enum (
  'beginner',
  'intermediate',
  'advanced',
  'expert'
);

create table public.student_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  bio text,
  year_level text,
  degree_type text,
  department text,
  availability public.profile_availability not null default 'open',
  experience_level public.profile_experience_level not null default 'beginner',
  preferred_collaboration_type public.collaboration_type[] not null default '{}',
  lab_experience boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint student_profiles_bio_max_length check (bio is null or char_length(bio) <= 500)
);

create table public.faculty_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  title text,
  department text,
  lab_name text,
  lab_url text,
  bio text,
  currently_recruiting boolean not null default false,
  recruiting_message text,
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.profile_research_interests (
  user_id uuid not null references auth.users(id) on delete cascade,
  interest_id bigint not null references public.research_interests(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, interest_id)
);

create table public.profile_skills (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id bigint not null references public.skills(id) on delete cascade,
  proficiency_level public.profile_skill_proficiency not null default 'beginner',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, skill_id)
);

create index profile_research_interests_user_id_idx on public.profile_research_interests (user_id);
create index profile_skills_user_id_idx on public.profile_skills (user_id);
create index student_profiles_department_idx on public.student_profiles (department);
create index faculty_profiles_department_idx on public.faculty_profiles (department);

create trigger set_student_profiles_updated_at
before update on public.student_profiles
for each row
execute function public.set_updated_at();

create trigger set_faculty_profiles_updated_at
before update on public.faculty_profiles
for each row
execute function public.set_updated_at();

insert into public.research_interests (name, category, parent_id)
values
  ('Machine Learning', 'Machine Learning', null),
  ('NLP', 'NLP', null),
  ('Computer Vision', 'Computer Vision', null),
  ('Systems', 'Systems', null),
  ('HCI', 'HCI', null),
  ('Computational Biology', 'Computational Biology', null),
  ('Public Policy + AI', 'Public Policy + AI', null),
  ('Cybersecurity', 'Cybersecurity', null),
  ('Robotics', 'Robotics', null),
  ('Data Science', 'Data Science', null),
  ('Quantum Computing', 'Quantum Computing', null),
  ('Ethics in AI', 'Ethics in AI', null);

insert into public.research_interests (name, category, parent_id)
select child.name, child.category, parent.id
from (
  values
    ('Supervised Learning', 'Machine Learning', 'Machine Learning'),
    ('Unsupervised Learning', 'Machine Learning', 'Machine Learning'),
    ('Reinforcement Learning', 'Machine Learning', 'Machine Learning'),
    ('Probabilistic Modeling', 'Machine Learning', 'Machine Learning'),
    ('Causal Inference', 'Machine Learning', 'Machine Learning'),

    ('Large Language Models', 'NLP', 'NLP'),
    ('Information Retrieval', 'NLP', 'NLP'),
    ('Dialogue Systems', 'NLP', 'NLP'),
    ('Text Summarization', 'NLP', 'NLP'),
    ('Low-Resource NLP', 'NLP', 'NLP'),

    ('Image Segmentation', 'Computer Vision', 'Computer Vision'),
    ('3D Vision', 'Computer Vision', 'Computer Vision'),
    ('Medical Imaging', 'Computer Vision', 'Computer Vision'),
    ('Multimodal Perception', 'Computer Vision', 'Computer Vision'),
    ('Video Understanding', 'Computer Vision', 'Computer Vision'),

    ('Distributed Systems', 'Systems', 'Systems'),
    ('Cloud Computing', 'Systems', 'Systems'),
    ('Database Systems', 'Systems', 'Systems'),
    ('Operating Systems', 'Systems', 'Systems'),
    ('Edge Computing', 'Systems', 'Systems'),

    ('User Experience Research', 'HCI', 'HCI'),
    ('Accessible Computing', 'HCI', 'HCI'),
    ('Human-Robot Interaction', 'HCI', 'HCI'),
    ('Educational Technology', 'HCI', 'HCI'),
    ('Civic Technology', 'HCI', 'HCI'),

    ('Genomics', 'Computational Biology', 'Computational Biology'),
    ('Protein Structure Prediction', 'Computational Biology', 'Computational Biology'),
    ('Biomedical NLP', 'Computational Biology', 'Computational Biology'),
    ('Systems Biology', 'Computational Biology', 'Computational Biology'),
    ('Single-Cell Analysis', 'Computational Biology', 'Computational Biology'),

    ('Algorithmic Governance', 'Public Policy + AI', 'Public Policy + AI'),
    ('AI for Public Health', 'Public Policy + AI', 'Public Policy + AI'),
    ('AI for Urban Planning', 'Public Policy + AI', 'Public Policy + AI'),
    ('Technology Policy Evaluation', 'Public Policy + AI', 'Public Policy + AI'),
    ('Responsible AI Procurement', 'Public Policy + AI', 'Public Policy + AI'),

    ('Network Security', 'Cybersecurity', 'Cybersecurity'),
    ('Privacy Enhancing Technologies', 'Cybersecurity', 'Cybersecurity'),
    ('Applied Cryptography', 'Cybersecurity', 'Cybersecurity'),
    ('Malware Analysis', 'Cybersecurity', 'Cybersecurity'),
    ('Security for Machine Learning', 'Cybersecurity', 'Cybersecurity'),

    ('Autonomous Navigation', 'Robotics', 'Robotics'),
    ('Robot Learning', 'Robotics', 'Robotics'),
    ('Robot Manipulation', 'Robotics', 'Robotics'),
    ('Swarm Robotics', 'Robotics', 'Robotics'),
    ('Medical Robotics', 'Robotics', 'Robotics'),

    ('Data Engineering', 'Data Science', 'Data Science'),
    ('Causal Data Analysis', 'Data Science', 'Data Science'),
    ('Time Series Modeling', 'Data Science', 'Data Science'),
    ('Geospatial Analytics', 'Data Science', 'Data Science'),
    ('Data Visualization', 'Data Science', 'Data Science'),

    ('Quantum Algorithms', 'Quantum Computing', 'Quantum Computing'),
    ('Quantum Information Theory', 'Quantum Computing', 'Quantum Computing'),
    ('Quantum Error Correction', 'Quantum Computing', 'Quantum Computing'),
    ('Quantum Machine Learning', 'Quantum Computing', 'Quantum Computing'),
    ('Quantum Hardware Systems', 'Quantum Computing', 'Quantum Computing'),

    ('Fairness and Bias', 'Ethics in AI', 'Ethics in AI'),
    ('Interpretability', 'Ethics in AI', 'Ethics in AI'),
    ('Accountability and Auditing', 'Ethics in AI', 'Ethics in AI'),
    ('AI Safety', 'Ethics in AI', 'Ethics in AI'),
    ('Human-Centered AI Policy', 'Ethics in AI', 'Ethics in AI')
) as child(name, category, parent_name)
join public.research_interests parent
  on parent.name = child.parent_name
 and parent.category = child.category
 and parent.parent_id is null;

insert into public.skills (name, category)
values
  ('Python', 'Programming'),
  ('R', 'Programming'),
  ('C++', 'Programming'),
  ('Java', 'Programming'),
  ('TypeScript', 'Programming'),
  ('SQL', 'Programming'),
  ('MATLAB', 'Programming'),
  ('Bash', 'Programming'),

  ('Linear Algebra', 'Math & Statistics'),
  ('Probability Theory', 'Math & Statistics'),
  ('Statistical Inference', 'Math & Statistics'),
  ('Optimization', 'Math & Statistics'),
  ('Bayesian Statistics', 'Math & Statistics'),
  ('Experimental Design', 'Math & Statistics'),
  ('Time Series Analysis', 'Math & Statistics'),
  ('Causal Inference Methods', 'Math & Statistics'),

  ('Literature Review', 'Research Methods'),
  ('Survey Design', 'Research Methods'),
  ('Qualitative Interviewing', 'Research Methods'),
  ('A/B Testing', 'Research Methods'),
  ('Reproducible Research', 'Research Methods'),
  ('IRB Protocol Preparation', 'Research Methods'),
  ('Scientific Writing', 'Research Methods'),
  ('Data Collection Pipelines', 'Research Methods'),

  ('PyTorch', 'Tools & Frameworks'),
  ('TensorFlow', 'Tools & Frameworks'),
  ('JAX', 'Tools & Frameworks'),
  ('scikit-learn', 'Tools & Frameworks'),
  ('Hugging Face Transformers', 'Tools & Frameworks'),
  ('Git', 'Tools & Frameworks'),
  ('Docker', 'Tools & Frameworks'),
  ('Kubernetes', 'Tools & Frameworks'),
  ('Linux', 'Tools & Frameworks'),
  ('Tableau', 'Tools & Frameworks'),
  ('Power BI', 'Tools & Frameworks'),
  ('SPSS', 'Tools & Frameworks'),

  ('Healthcare Informatics', 'Domain Knowledge'),
  ('Public Policy Analysis', 'Domain Knowledge'),
  ('Cyber Risk Management', 'Domain Knowledge'),
  ('Bioinformatics', 'Domain Knowledge'),
  ('Robotics Controls', 'Domain Knowledge'),
  ('Human-Centered Design', 'Domain Knowledge'),
  ('Educational Assessment', 'Domain Knowledge'),
  ('Climate and Sustainability Data', 'Domain Knowledge');

alter table public.profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.faculty_profiles enable row level security;
alter table public.profile_research_interests enable row level security;
alter table public.profile_skills enable row level security;
alter table public.research_interests enable row level security;
alter table public.skills enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "student_profiles_select_own" on public.student_profiles;
drop policy if exists "student_profiles_insert_own" on public.student_profiles;
drop policy if exists "student_profiles_update_own" on public.student_profiles;
drop policy if exists "student_profiles_delete_own" on public.student_profiles;

create policy "student_profiles_select_own"
on public.student_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "student_profiles_insert_own"
on public.student_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "student_profiles_update_own"
on public.student_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "student_profiles_delete_own"
on public.student_profiles
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "faculty_profiles_select_own" on public.faculty_profiles;
drop policy if exists "faculty_profiles_insert_own" on public.faculty_profiles;
drop policy if exists "faculty_profiles_update_own" on public.faculty_profiles;
drop policy if exists "faculty_profiles_delete_own" on public.faculty_profiles;

create policy "faculty_profiles_select_own"
on public.faculty_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "faculty_profiles_insert_own"
on public.faculty_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "faculty_profiles_update_own"
on public.faculty_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "faculty_profiles_delete_own"
on public.faculty_profiles
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "profile_research_interests_select_own" on public.profile_research_interests;
drop policy if exists "profile_research_interests_insert_own" on public.profile_research_interests;
drop policy if exists "profile_research_interests_update_own" on public.profile_research_interests;
drop policy if exists "profile_research_interests_delete_own" on public.profile_research_interests;

create policy "profile_research_interests_select_own"
on public.profile_research_interests
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "profile_research_interests_insert_own"
on public.profile_research_interests
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "profile_research_interests_update_own"
on public.profile_research_interests
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "profile_research_interests_delete_own"
on public.profile_research_interests
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "profile_skills_select_own" on public.profile_skills;
drop policy if exists "profile_skills_insert_own" on public.profile_skills;
drop policy if exists "profile_skills_update_own" on public.profile_skills;
drop policy if exists "profile_skills_delete_own" on public.profile_skills;

create policy "profile_skills_select_own"
on public.profile_skills
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "profile_skills_insert_own"
on public.profile_skills
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "profile_skills_update_own"
on public.profile_skills
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "profile_skills_delete_own"
on public.profile_skills
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "research_interests_read_authenticated" on public.research_interests;
drop policy if exists "skills_read_authenticated" on public.skills;

create policy "research_interests_read_authenticated"
on public.research_interests
for select
to authenticated
using (true);

create policy "skills_read_authenticated"
on public.skills
for select
to authenticated
using (true);

revoke all on table public.research_interests from anon;
revoke all on table public.research_interests from authenticated;
grant select on table public.research_interests to authenticated;

revoke all on table public.skills from anon;
revoke all on table public.skills from authenticated;
grant select on table public.skills to authenticated;

grant usage, select on sequence public.research_interests_id_seq to authenticated;
grant usage, select on sequence public.skills_id_seq to authenticated;
