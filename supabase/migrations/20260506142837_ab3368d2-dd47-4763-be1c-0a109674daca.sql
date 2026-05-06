-- Remove duplicate legacy triggers now that canonical triggers are active
DROP TRIGGER IF EXISTS refresh_stats_on_listings ON public.market_listings;
DROP TRIGGER IF EXISTS touch_conversation_on_message_insert ON public.messages;
DROP TRIGGER IF EXISTS refresh_stats_on_scans ON public.scan_results;
DROP TRIGGER IF EXISTS sync_profile_scan_count_on_scan_change ON public.scan_results;

SELECT public.refresh_app_public_stats();