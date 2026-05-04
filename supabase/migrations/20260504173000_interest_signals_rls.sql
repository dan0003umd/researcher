DO $$
BEGIN
  IF to_regclass('public.interest_signals') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.interest_signals ENABLE ROW LEVEL SECURITY;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interest_signals'
      AND policyname = 'Students can insert own signals'
  ) THEN
    CREATE POLICY "Students can insert own signals"
    ON public.interest_signals FOR INSERT
    WITH CHECK (auth.uid() = student_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interest_signals'
      AND policyname = 'Students can view own signals'
  ) THEN
    CREATE POLICY "Students can view own signals"
    ON public.interest_signals FOR SELECT
    USING (auth.uid() = student_id OR auth.uid() = faculty_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interest_signals'
      AND policyname = 'Faculty can update signal status'
  ) THEN
    CREATE POLICY "Faculty can update signal status"
    ON public.interest_signals FOR UPDATE
    USING (auth.uid() = faculty_id);
  END IF;
END
$$;