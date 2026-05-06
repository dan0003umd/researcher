-- Add editable profile fields and signal review tracking for dashboard UX.
ALTER TYPE public.collaboration_type ADD VALUE IF NOT EXISTS 'independent_project';
ALTER TYPE public.collaboration_type ADD VALUE IF NOT EXISTS 'thesis_collaboration';
ALTER TYPE public.collaboration_type ADD VALUE IF NOT EXISTS 'casual_mentorship';

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS hours_per_week text,
  ADD COLUMN IF NOT EXISTS start_date_availability text,
  ADD COLUMN IF NOT EXISTS github_url text;

ALTER TABLE public.student_profiles
  DROP CONSTRAINT IF EXISTS student_profiles_hours_per_week_check,
  ADD CONSTRAINT student_profiles_hours_per_week_check CHECK (
    hours_per_week IS NULL OR hours_per_week IN ('5-10', '10-20', '20+')
  ),
  DROP CONSTRAINT IF EXISTS student_profiles_start_date_availability_check,
  ADD CONSTRAINT student_profiles_start_date_availability_check CHECK (
    start_date_availability IS NULL OR start_date_availability IN ('immediately', 'next_semester', 'flexible')
  );

ALTER TABLE public.faculty_profiles
  ADD COLUMN IF NOT EXISTS sought_student_levels text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS personal_website_url text;

ALTER TABLE public.faculty_profiles
  DROP CONSTRAINT IF EXISTS faculty_profiles_sought_student_levels_check,
  ADD CONSTRAINT faculty_profiles_sought_student_levels_check CHECK (
    sought_student_levels <@ ARRAY['undergrad', 'ms', 'phd']::text[]
  );

ALTER TABLE public.interest_signals
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now());

DROP TRIGGER IF EXISTS set_interest_signals_updated_at ON public.interest_signals;
CREATE TRIGGER set_interest_signals_updated_at
BEFORE UPDATE ON public.interest_signals
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

UPDATE public.interest_signals
SET reviewed_at = COALESCE(reviewed_at, created_at)
WHERE status = 'reviewed'
  AND reviewed_at IS NULL;
