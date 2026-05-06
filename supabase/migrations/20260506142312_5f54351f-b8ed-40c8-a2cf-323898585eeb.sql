-- Fix permissions for role checks used inside access rules
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT USAGE ON TYPE public.app_role TO anon, authenticated;

-- Recreate missing triggers that keep marketplace/stats/activity data synchronized
DROP TRIGGER IF EXISTS sync_scan_count_on_scan_results ON public.scan_results;
CREATE TRIGGER sync_scan_count_on_scan_results
AFTER INSERT OR UPDATE OR DELETE ON public.scan_results
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_scan_count();

DROP TRIGGER IF EXISTS refresh_stats_on_profiles ON public.profiles;
CREATE TRIGGER refresh_stats_on_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.refresh_app_public_stats_trigger();

DROP TRIGGER IF EXISTS refresh_stats_on_scan_results ON public.scan_results;
CREATE TRIGGER refresh_stats_on_scan_results
AFTER INSERT OR UPDATE OR DELETE ON public.scan_results
FOR EACH ROW
EXECUTE FUNCTION public.refresh_app_public_stats_trigger();

DROP TRIGGER IF EXISTS refresh_stats_on_market_listings ON public.market_listings;
CREATE TRIGGER refresh_stats_on_market_listings
AFTER INSERT OR UPDATE OR DELETE ON public.market_listings
FOR EACH ROW
EXECUTE FUNCTION public.refresh_app_public_stats_trigger();

DROP TRIGGER IF EXISTS touch_conversation_after_message ON public.messages;
CREATE TRIGGER touch_conversation_after_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_conversation_on_message();

DROP TRIGGER IF EXISTS award_referral_points_on_insert ON public.referrals;
CREATE TRIGGER award_referral_points_on_insert
BEFORE INSERT ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.award_referral_points();

-- Keep timestamps current on marketplace edits
DROP TRIGGER IF EXISTS update_market_listings_updated_at ON public.market_listings;
CREATE TRIGGER update_market_listings_updated_at
BEFORE UPDATE ON public.market_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Refresh historical aggregate data now
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT user_id FROM public.profiles LOOP
    PERFORM public.refresh_profile_scan_count(r.user_id);
  END LOOP;
END $$;

SELECT public.refresh_app_public_stats();

-- Ensure realtime receives full row data for reliable UI refreshes
ALTER TABLE public.market_listings REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.scan_results REPLICA IDENTITY FULL;