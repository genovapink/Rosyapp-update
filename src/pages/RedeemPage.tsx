import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Gift, Star, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Reward {
  id: string;
  brand: string;
  name: string;
  description: string | null;
  image_url: string | null;
  points_cost: number;
  stock: number;
  is_active: boolean;
}

const RedeemPage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [voucherShown, setVoucherShown] = useState<{ name: string; code: string } | null>(null);

  const fetchRewards = async () => {
    setLoading(true);
    const { data } = await supabase.from("rewards" as any).select("*").eq("is_active", true).gt("stock", 0).order("points_cost");
    setRewards((data || []) as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchRewards(); }, []);

  const handleRedeem = async (reward: Reward) => {
    if (!user || !profile) { toast.error("Login dulu"); navigate("/auth"); return; }
    if ((profile.points || 0) < reward.points_cost) { toast.error("Poin tidak cukup"); return; }

    setRedeeming(reward.id);
    try {
      // Get an unused code
      const { data: codeData, error: codeErr } = await supabase
        .from("reward_codes" as any)
        .select("*")
        .eq("reward_id", reward.id)
        .eq("is_used", false)
        .limit(1)
        .maybeSingle();

      if (codeErr || !codeData) { toast.error("Stok voucher habis"); setRedeeming(null); return; }
      const code = (codeData as any).code;

      // Mark code used
      await supabase.from("reward_codes" as any).update({
        is_used: true, used_by: user.id, used_at: new Date().toISOString(),
      } as any).eq("id", (codeData as any).id);

      // Create redemption record
      await supabase.from("redemptions" as any).insert({
        user_id: user.id, reward_id: reward.id, points_spent: reward.points_cost, voucher_code: code,
      } as any);

      // Deduct points + reduce stock
      await supabase.from("profiles").update({ points: profile.points - reward.points_cost } as any).eq("user_id", user.id);
      await supabase.from("rewards" as any).update({ stock: reward.stock - 1 } as any).eq("id", reward.id);

      await refreshProfile();
      fetchRewards();
      setVoucherShown({ name: `${reward.brand} - ${reward.name}`, code });
    } catch (e: any) {
      toast.error(e.message || "Gagal redeem");
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="px-4 pt-6 pb-10 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" /> Redeem Reward
          </h1>
          <p className="text-xs text-muted-foreground">Tukar poin Rosy dengan voucher digital</p>
        </div>
      </div>

      <div className="rosi-gradient text-primary-foreground rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold opacity-90">Poin kamu</p>
          <p className="text-3xl font-extrabold">{profile?.points || 0}</p>
        </div>
        <Star className="w-10 h-10 fill-current opacity-80" />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : rewards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-semibold">Belum ada reward tersedia</p>
          <p className="text-xs mt-1">Cek kembali nanti ya!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rewards.map((r) => {
            const canAfford = (profile?.points || 0) >= r.points_cost;
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-3 flex gap-3">
                {r.image_url ? (
                  <img src={r.image_url} alt={r.name} className="w-20 h-20 rounded-lg object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                    <Gift className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wide">{r.brand}</p>
                  <p className="text-sm font-bold text-foreground truncate">{r.name}</p>
                  {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Star className="w-3 h-3 text-primary fill-primary" /> {r.points_cost} pts
                    </span>
                    <button onClick={() => handleRedeem(r)} disabled={!canAfford || redeeming === r.id}
                      className="px-3 py-1.5 rounded-lg rosi-gradient text-primary-foreground text-xs font-bold disabled:opacity-40">
                      {redeeming === r.id ? "..." : canAfford ? "Tukar" : "Kurang"}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {voucherShown && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center px-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-2xl p-6 w-full max-w-sm space-y-4 text-center">
            <Gift className="w-12 h-12 text-primary mx-auto" />
            <h3 className="text-lg font-extrabold text-foreground">Voucher Kamu</h3>
            <p className="text-sm text-muted-foreground">{voucherShown.name}</p>
            <div className="bg-muted rounded-xl p-4 border-2 border-dashed border-primary">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Kode Voucher</p>
              <p className="text-xl font-extrabold text-foreground tracking-wider mt-1 select-all">{voucherShown.code}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(voucherShown.code); toast.success("Kode disalin"); }}
              className="w-full bg-card border border-border text-foreground py-2.5 rounded-xl font-bold text-sm">
              Salin Kode
            </button>
            <button onClick={() => setVoucherShown(null)}
              className="w-full rosi-gradient text-primary-foreground py-2.5 rounded-xl font-bold text-sm">
              Selesai
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default RedeemPage;
