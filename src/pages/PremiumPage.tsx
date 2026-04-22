import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, Check, MessageCircle, Wallet, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const PREMIUM_POINTS_COST = 500;
const ADMIN_WHATSAPP = "6288242150920";
const RECEIVING_WALLET = "0x0E3fCDD57e0B52a42E83D1B7bc5D75f782076057";

const PremiumPage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [redeeming, setRedeeming] = useState(false);

  const benefits = [
    "10 listing per bulan (free: 3)",
    "100 scan per bulan (free: 30)",
    "Upload foto profil sendiri",
    "Blue checkmark di profil & marketplace",
    "Prioritas dukungan",
  ];

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(`Halo Rosy, saya ${profile?.nickname || "user"} (${user?.email}) ingin upgrade ke Premium. Mohon info pembayaran.`);
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${msg}`, "_blank");
  };

  const handleRedeemWithPoints = async () => {
    if (!user || !profile) { navigate("/auth"); return; }
    if ((profile.points || 0) < PREMIUM_POINTS_COST) { toast.error(`Butuh ${PREMIUM_POINTS_COST} poin`); return; }
    setRedeeming(true);
    try {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      await supabase.from("premium_subscriptions" as any).insert({
        user_id: user.id, source: "points", end_date: endDate.toISOString(),
        points_spent: PREMIUM_POINTS_COST, status: "active",
      } as any);

      await supabase.from("profiles").update({
        is_premium: true, premium_until: endDate.toISOString(),
        points: profile.points - PREMIUM_POINTS_COST,
      } as any).eq("user_id", user.id);

      await refreshProfile();
      toast.success("Premium aktif selama 30 hari! 🎉");
      navigate("/profile");
    } catch (e: any) {
      toast.error(e.message || "Gagal");
    } finally {
      setRedeeming(false);
    }
  };

  const handleUSDC = () => {
    toast.info("Buka MetaMask & kirim 5 USDC (Base) ke alamat di bawah, lalu hubungi admin via WhatsApp dengan tx hash.");
    navigator.clipboard.writeText(RECEIVING_WALLET);
    toast.success("Alamat wallet disalin");
  };

  const isPremiumActive = profile?.is_premium && (!profile?.premium_until || new Date(profile.premium_until) > new Date());

  return (
    <div className="px-4 pt-6 pb-10 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" /> Rosy Premium
        </h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rosi-gradient text-primary-foreground rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Crown className="w-6 h-6 fill-current" />
          <h2 className="text-lg font-extrabold">Upgrade ke Premium</h2>
        </div>
        {isPremiumActive ? (
          <p className="text-sm">✅ Premium aktif sampai {new Date(profile!.premium_until!).toLocaleDateString("id-ID")}</p>
        ) : (
          <p className="text-sm opacity-90">Dapatkan akses penuh dan bantu Rosy tumbuh 🌱</p>
        )}
      </motion.div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <h3 className="font-bold text-foreground">Benefit Premium</h3>
        {benefits.map((b) => (
          <div key={b} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span className="text-sm text-foreground">{b}</span>
          </div>
        ))}
      </div>

      {!isPremiumActive && (
        <div className="space-y-3">
          <h3 className="font-bold text-foreground">Pilih Cara Upgrade</h3>

          <button onClick={handleWhatsApp}
            className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-3 text-left hover:bg-muted transition-colors">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Manual via WhatsApp</p>
              <p className="text-xs text-muted-foreground">Hubungi admin: +62 882-4215-0920</p>
            </div>
          </button>

          <button onClick={handleUSDC}
            className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-3 text-left hover:bg-muted transition-colors">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Bayar 5 USDC di Base</p>
              <p className="text-xs text-muted-foreground break-all">{RECEIVING_WALLET.slice(0, 10)}...{RECEIVING_WALLET.slice(-6)}</p>
            </div>
          </button>

          <button onClick={handleRedeemWithPoints} disabled={redeeming}
            className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-3 text-left hover:bg-muted transition-colors disabled:opacity-50">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-600 fill-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Tukar {PREMIUM_POINTS_COST} Rosy Points</p>
              <p className="text-xs text-muted-foreground">Poin kamu: {profile?.points || 0}</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default PremiumPage;
