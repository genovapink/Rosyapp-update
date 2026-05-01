CREATE OR REPLACE FUNCTION public.refresh_profile_scan_count(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET total_scans = (
    SELECT count(*)::integer
    FROM public.scan_results
    WHERE user_id = _user_id
  ),
  updated_at = now()
  WHERE user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_profile_scan_count(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.sync_profile_scan_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_profile_scan_count(OLD.user_id);
    RETURN OLD;
  END IF;

  PERFORM public.refresh_profile_scan_count(NEW.user_id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_profile_scan_count() FROM PUBLIC;

DROP TRIGGER IF EXISTS sync_profile_scan_count_on_scan_change ON public.scan_results;
CREATE TRIGGER sync_profile_scan_count_on_scan_change
AFTER INSERT OR DELETE ON public.scan_results
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_scan_count();

CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_conversation_on_message() FROM PUBLIC;

DROP TRIGGER IF EXISTS touch_conversation_on_message_insert ON public.messages;
CREATE TRIGGER touch_conversation_on_message_insert
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_conversation_on_message();