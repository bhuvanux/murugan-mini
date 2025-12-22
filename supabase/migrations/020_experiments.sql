-- Experiments (A/B testing) - minimal & privacy-safe

CREATE TABLE IF NOT EXISTS public.experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'running', 'paused', 'completed')) DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.experiment_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  traffic_percent INT NOT NULL CHECK (traffic_percent BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (experiment_id, variant_key)
);

CREATE TABLE IF NOT EXISTS public.experiment_assignments (
  experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  user_bucket TEXT NOT NULL,
  variant_key TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (experiment_id, user_bucket)
);

CREATE INDEX IF NOT EXISTS idx_experiments_status ON public.experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiments_dates ON public.experiments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_experiment_variants_experiment ON public.experiment_variants(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_bucket ON public.experiment_assignments(user_bucket);

ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read running experiments" ON public.experiments;
CREATE POLICY "Public can read running experiments"
  ON public.experiments
  FOR SELECT
  USING (
    status = 'running'
    AND (start_date IS NULL OR start_date <= (now() AT TIME ZONE 'utc')::date)
    AND (end_date IS NULL OR end_date >= (now() AT TIME ZONE 'utc')::date)
  );

DROP POLICY IF EXISTS "Public can read variants for running experiments" ON public.experiment_variants;
CREATE POLICY "Public can read variants for running experiments"
  ON public.experiment_variants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.experiments e
      WHERE e.id = experiment_id
        AND e.status = 'running'
        AND (e.start_date IS NULL OR e.start_date <= (now() AT TIME ZONE 'utc')::date)
        AND (e.end_date IS NULL OR e.end_date >= (now() AT TIME ZONE 'utc')::date)
    )
  );

DROP POLICY IF EXISTS "Service role can manage experiments" ON public.experiments;
CREATE POLICY "Service role can manage experiments"
  ON public.experiments
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage experiment variants" ON public.experiment_variants;
CREATE POLICY "Service role can manage experiment variants"
  ON public.experiment_variants
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage experiment assignments" ON public.experiment_assignments;
CREATE POLICY "Service role can manage experiment assignments"
  ON public.experiment_assignments
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
