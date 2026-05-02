import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const FREE_LIMITS = { scans: 30, listings: 3 };
export const PREMIUM_LIMITS = { scans: 100, listings: 10 };
export const POINTS_PER_SCAN = 1;
export const POINTS_PER_LISTING = 5;

const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const useUsageLimits = () => {
  const { user, profile, refreshProfile } = useAuth();

  const isPremium = !!profile?.is_premium && (!profile?.premium_until || new Date(profile.premium_until) > new Date());
  const limits = isPremium ? PREMIUM_LIMITS : FREE_LIMITS;

  const getUsage = useCallback(async () => {
    if (!user) return { scans_count: 0, listings_count: 0 };
    const { data } = await supabase
      .from("usage_counters")
      .select("scans_count, listings_count")
      .eq("user_id", user.id)
      .eq("period", currentPeriod())
      .maybeSingle();
    return data || { scans_count: 0, listings_count: 0 };
  }, [user]);

  const recordActivity = useCallback(
    async (activity: "scan" | "listing", points: number) => {
      if (!user) return;
      const { error } = await (supabase as any).rpc("increment_user_activity", {
        _activity: activity,
        _points: points,
      });
      if (error) throw error;
      await refreshProfile();
    },
    [user, refreshProfile]
  );

  const incrementCounter = useCallback(
    async (field: "scans_count" | "listings_count") => {
      await recordActivity(field === "scans_count" ? "scan" : "listing", 0);
    },
    [recordActivity]
  );

  const awardPoints = useCallback(
    async (points: number) => {
      if (!user || !profile) return;
      await supabase
        .from("profiles")
        .update({ points: (profile.points || 0) + points } as any)
        .eq("user_id", user.id);
      await refreshProfile();
    },
    [user, profile, refreshProfile]
  );

  const checkScanAllowed = useCallback(async () => {
    const usage = await getUsage();
    return { allowed: usage.scans_count < limits.scans, used: usage.scans_count, max: limits.scans };
  }, [getUsage, limits]);

  const checkListingAllowed = useCallback(async () => {
    const usage = await getUsage();
    return { allowed: usage.listings_count < limits.listings, used: usage.listings_count, max: limits.listings };
  }, [getUsage, limits]);

  return {
    isPremium,
    limits,
    getUsage,
    recordActivity,
    incrementCounter,
    awardPoints,
    checkScanAllowed,
    checkListingAllowed,
  };
};
