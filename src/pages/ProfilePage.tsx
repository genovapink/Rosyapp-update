import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, LogOut, History, ShoppingBag, Scan, Recycle, Star, ChevronRight, Megaphone, Edit2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ProfilePage = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  useEffect(() => {
    if (user && showHistory) {
      supabase.from("scan_results").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
        setScanHistory((data || []) as any[]);
      });
    }
  }, [user, showHistory]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ nickname, phone } as any).eq("user_id", user.id);
    if (error) { toast.error("Gagal update profil"); return; }
    toast.success("Profil berhasil diupdate!");
    setShowEditProfile(false);
    await refreshProfile();
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
    <div className="px-4 pt-6 space-y-6">
      {/* Avatar & Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center relative">
        <button onClick={() => setShowEditProfile(true)} className="absolute top-0 right-0">
          <Edit2 className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="w-20 h-20 rounded-full bg-muted border-4 border-primary/20 flex items-center justify-center">
          <span className="text-2xl font-bold text-muted-foreground">
            {(profile?.nickname || "U")[0].toUpperCase()}
          </span>
        </div>
        <h2 className="text-xl font-extrabold text-foreground mt-3">{profile?.nickname || "User"}</h2>
        <p className="text-sm text-muted-foreground">{user.email}</p>
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
        <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-left">
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
    </div>
  );
};

export default ProfilePage;
