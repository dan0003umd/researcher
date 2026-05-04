CREATE TABLE IF NOT EXISTS public.interest_signals (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references auth.users(id) on delete cascade,
  faculty_id uuid references auth.users(id) on delete cascade,
  message text check (char_length(message) <= 300),
  status text default 'pending' check (status in ('pending', 'reviewed', 'archived')),
  created_at timestamptz default now(),
  UNIQUE(student_id, faculty_id)
);

ALTER TABLE public.interest_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own signals"
ON public.interest_signals FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view own signals"
ON public.interest_signals FOR SELECT
USING (auth.uid() = student_id OR auth.uid() = faculty_id);

CREATE POLICY "Faculty can update signal status"
ON public.interest_signals FOR UPDATE
USING (auth.uid() = faculty_id);