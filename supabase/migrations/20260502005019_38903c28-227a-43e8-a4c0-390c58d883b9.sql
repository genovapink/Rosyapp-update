DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_public_stats;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;