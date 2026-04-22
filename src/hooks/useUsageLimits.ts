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

  const incrementCounter = useCallback(
    async (field: "scans_count" | "listings_count") => {
      if (!user) return;
      const period = currentPeriod();
      const current = await getUsage();
      const newValue = (current as any)[field] + 1;
      await supabase
        .from("usage_counters")
        .upsert(
          {
            user_id: user.id,
            period,
            scans_count: field === "scans_count" ? newValue : (current as any).scans_count,
            listings_count: field === "listings_count" ? newValue : (current as any).listings_count,
          } as any,
          { onConflict: "user_id,period" }
        );
    },
    [user, getUsage]
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
    incrementCounter,
    awardPoints,
    checkScanAllowed,
    checkListingAllowed,
  };
};
