import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Settings, LogOut, History, ShoppingBag, Scan, Recycle, Star, ChevronRight, Megaphone, Edit2, X, Crown, Gift, Camera, AlertTriangle, Link, Copy, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUsageLimits, FREE_LIMITS, PREMIUM_LIMITS } from "@/hooks/useUsageLimits";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ProfilePage = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { isPremium, getUsage, limits } = useUsageLimits();
  const navigate = useNavigate();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [passwordConfirmText, setPasswordConfirmText] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [usage, setUsage] = useState({ scans_count: 0, listings_count: 0 });
  const [warnings, setWarnings] = useState<any[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      getUsage().then(setUsage);
      supabase.from("warnings" as any).select("*").eq("user_id", user.id).eq("acknowledged", false).then(({ data }) => {
        setWarnings((data || []) as any[]);
      });
      supabase.from("referrals" as any).select("id", { count: "exact", head: true }).eq("referrer_id", user.id).then(({ count }) => {
        setReferralCount(count || 0);
      });
    }
  }, [user, getUsage]);

  useEffect(() => {
    if (user && showHistory) {
      supabase.from("scan_results").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
        setScanHistory((data || []) as any[]);
      });
    }
  }, [user, showHistory]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    if (!isPremium) { toast.error("Upload foto profil hanya untuk Premium"); navigate("/premium"); return; }
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Maks 5 MB"); return; }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: urlData.publicUrl } as any).eq("user_id", user.id);
      await refreshProfile();
      toast.success("Foto profil diperbarui!");
    } catch (err: any) {
      toast.error(err.message || "Gagal upload");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const acknowledgeWarning = async (id: string) => {
    await supabase.from("warnings" as any).update({ acknowledged: true } as any).eq("id", id);
    setWarnings((w) => w.filter((x) => x.id !== id));
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ nickname, phone } as any).eq("user_id", user.id);
    if (error) { toast.error("Gagal update profil"); return; }
    toast.success("Profil berhasil diupdate!");
    setShowEditProfile(false);
    await refreshProfile();
  };

  const referralLink = user ? `${window.location.origin}/auth?ref=${user.id}` : "";

  const copyReferralLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    toast.success("Referral link disalin");
  };

  const handleChangePasswordRequest = () => {
    if (passwordConfirmText.trim() !== "I want to change my password") {
      toast.error('Tulis tepat: "I want to change my password"');
      return;
    }
    navigate("/auth?mode=new-password");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] px-4 space-y-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <span className="text-3xl">👤</span>
        </div>
        <h2 className="text-xl font-extrabold text-foreground">Belum Login</h2>
        <p className="text-sm text-muted-foreground text-center">Masuk untuk menyimpan riwayat scan dan poin Rosy kamu</p>
        <button onClick={() => navigate("/auth")} className="rosi-gradient text-primary-foreground px-8 py-3 rounded-xl font-bold text-sm">
          Login / Daftar
        </button>
      </div>
    );
  }

  if (showHistory) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <button onClick={() => setShowHistory(false)} className="flex items-center gap-2 text-sm text-muted-foreground">
          <ChevronRight className="w-4 h-4 rotate-180" /> Kembali
        </button>
        <h1 className="text-xl font-extrabold text-foreground">Riwayat Scan</h1>
        {scanHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Belum ada scan</p>
        ) : (
          <div className="space-y-3">
            {scanHistory.map((scan: any) => (
              <div key={scan.id} className="bg-card border border-border rounded-xl p-3 flex gap-3">
                {scan.image_url && <img src={scan.image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />}
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{scan.result_name}</p>
                  <p className="text-xs text-muted-foreground">{scan.category} • {new Date(scan.created_at).toLocaleDateString("id-ID")}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${scan.is_valuable ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {scan.is_valuable ? "💰 Bernilai" : "♻️ Daur Ulang"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-6 pb-6">
      {/* Warnings */}
      {warnings.map((w) => (
        <div key={w.id} className="bg-destructive/10 border border-destructive/40 rounded-xl p-3 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-destructive">Peringatan Admin</p>
            <p className="text-xs text-foreground">{w.message}</p>
          </div>
          <button onClick={() => acknowledgeWarning(w.id)} className="text-xs font-bold text-destructive">OK</button>
        </div>
      ))}

      {/* Avatar & Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center relative">
        <button onClick={() => setShowEditProfile(true)} className="absolute top-0 right-0">
          <Edit2 className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="relative">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" className="w-20 h-20 rounded-full object-cover border-4 border-primary/20" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted border-4 border-primary/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">
                {(profile?.nickname || "U")[0].toUpperCase()}
              </span>
            </div>
          )}
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          <button
            onClick={() => isPremium ? avatarInputRef.current?.click() : navigate("/premium")}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 w-7 h-7 rosi-gradient rounded-full flex items-center justify-center shadow-md"
          >
            <Camera className="w-3.5 h-3.5 text-primary-foreground" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 mt-3">
          <h2 className="text-xl font-extrabold text-foreground">{profile?.nickname || "User"}</h2>
          {profile?.is_official && <VerifiedBadge variant="official" className="w-5 h-5" />}
          {!profile?.is_official && isPremium && <VerifiedBadge variant="premium" className="w-5 h-5" />}
        </div>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        {isPremium && (
          <span className="mt-1 inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-yellow-500/15 text-yellow-700 text-[10px] font-bold">
            <Crown className="w-3 h-3" /> PREMIUM
          </span>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3 text-center border border-border bg-card">
          <p className="text-lg font-extrabold text-foreground">{profile?.points || 0}</p>
          <p className="text-[10px] font-bold text-muted-foreground">POINTS</p>
        </div>
        <div className="rounded-xl p-3 text-center border border-primary bg-secondary">
          <p className="text-lg font-extrabold text-primary">Level {profile?.level || 1}</p>
          <p className="text-[10px] font-bold text-muted-foreground">RECYCLER</p>
        </div>
      </div>

      {/* Referral */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-foreground">Referral Rosy</h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{referralCount}/4</span>
        </div>
        <p className="text-xs text-muted-foreground">Dapatkan 50 poin Rosy untuk setiap teman yang daftar lewat link kamu. Maksimal 4 orang.</p>
        <button onClick={copyReferralLink} className="w-full flex items-center justify-center gap-2 rosi-gradient text-primary-foreground py-2.5 rounded-xl text-xs font-bold">
          <Copy className="w-3.5 h-3.5" /> Salin Referral Link
        </button>
      </div>

      {/* Monthly usage */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground">Pemakaian Bulan Ini</h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPremium ? "bg-yellow-500/15 text-yellow-700" : "bg-muted text-muted-foreground"}`}>
            {isPremium ? "PREMIUM" : "FREE"}
          </span>
        </div>
        <div className="space-y-2 text-sm">
          <div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Scan</span><span>{usage.scans_count} / {limits.scans}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
              <div className="h-full rosi-gradient" style={{ width: `${Math.min(100, (usage.scans_count / limits.scans) * 100)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Listing</span><span>{usage.listings_count} / {limits.listings}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
              <div className="h-full rosi-gradient" style={{ width: `${Math.min(100, (usage.listings_count / limits.listings) * 100)}%` }} />
            </div>
          </div>
        </div>
        {!isPremium && (
          <button onClick={() => navigate("/premium")}
            className="w-full mt-2 rosi-gradient text-primary-foreground py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
            <Crown className="w-3.5 h-3.5" /> Upgrade ke Premium
          </button>
        )}
      </div>

      {/* Statistics */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-foreground">Statistik Kamu</h3>
        <div className="space-y-2">
          {[
            { icon: Scan, label: "Total Scan", value: String(profile?.total_scans || 0) },
            { icon: Recycle, label: "Sampah Terselamatkan", value: `${profile?.total_recycled_kg || 0} kg` },
            { icon: Star, label: "Poin Rosy", value: String(profile?.points || 0) },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
              <span className="text-sm font-bold text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="space-y-1">
        <h3 className="font-bold text-foreground mb-2">Account</h3>

        <button onClick={() => navigate("/premium")}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-left">
          <Crown className="w-5 h-5 text-yellow-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Rosy Premium</p>
            <p className="text-xs text-muted-foreground">{isPremium ? "Aktif" : "Upgrade untuk benefit lebih"}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        <button onClick={() => navigate("/redeem")}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-left">
          <Gift className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Redeem Reward</p>
            <p className="text-xs text-muted-foreground">Tukar poin dengan voucher</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        <button onClick={() => navigate("/advertise")}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-left">
          <Megaphone className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Advertise with Us</p>
            <p className="text-xs text-muted-foreground">Promote your business on Rosy</p>
          </div>
          <span className="px-3 py-1 rounded-full border border-primary text-primary text-xs font-bold">Pay Now</span>
        </button>
        <button onClick={() => setShowHistory(true)} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-left">
          <History className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground flex-1">Riwayat Scan</p>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-left">
          <ShoppingBag className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground flex-1">Riwayat Transaksi</p>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-left">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground flex-1">Settings</p>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/10 transition-colors">
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="text-sm font-semibold text-destructive">Log Out</span>
        </button>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center px-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Edit Profile</h3>
              <button onClick={() => setShowEditProfile(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Nickname</label>
                <input value={nickname} onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Phone Number</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <button onClick={handleUpdateProfile} className="w-full rosi-gradient text-primary-foreground py-3 rounded-xl font-bold text-sm">
              Save Changes
            </button>
          </motion.div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center px-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Settings</h3>
              <button onClick={() => setShowSettings(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <KeyRound className="w-4 h-4 text-primary" /> Ganti Password
              </div>
              <input value={passwordConfirmText} onChange={(e) => setPasswordConfirmText(e.target.value)} placeholder="I want to change my password"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button onClick={handleChangePasswordRequest} className="w-full rosi-gradient text-primary-foreground py-3 rounded-xl font-bold text-sm">
                Lanjut Ganti Password
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
