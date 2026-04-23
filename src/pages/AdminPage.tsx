import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Trash2, Eye, EyeOff, Ban, ShoppingBag, Megaphone, Users, ArrowLeft, RefreshCw, Crown, Gift, AlertTriangle, Plus, X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ADMIN_PASSWORD = "317130G";

type Tab = "promotions" | "listings" | "users" | "rewards";

const AdminPage = () => {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("promotions");
  const [promotions, setPromotions] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Reward form
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    brand: "", name: "", description: "", points_cost: 100, stock: 1, codes: "", image_url: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Promotion form
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoForm, setPromoForm] = useState({
    title: "", description: "", link_url: "",
  });
  const [promoImageFile, setPromoImageFile] = useState<File | null>(null);
  const [promoSubmitting, setPromoSubmitting] = useState(false);

  // Warn modal
  const [warnTarget, setWarnTarget] = useState<any>(null);
  const [warnMessage, setWarnMessage] = useState("");

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      toast.success("Admin access granted");
    } else {
      toast.error("Password salah");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const [promoRes, listRes, userRes, rewardRes] = await Promise.all([
      supabase.from("promotions").select("*").order("created_at", { ascending: false }),
      supabase.from("market_listings").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("rewards" as any).select("*").order("created_at", { ascending: false }),
    ]);
    setPromotions((promoRes.data || []) as any[]);
    setListings((listRes.data || []) as any[]);
    setUsers((userRes.data || []) as any[]);
    setRewards((rewardRes.data || []) as any[]);
    setLoading(false);
  };

  useEffect(() => { if (authenticated) fetchData(); }, [authenticated]);

  // Promotions
  const togglePromotionStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "expired" : "active";
    const { error } = await supabase.from("promotions").update({ status: newStatus } as any).eq("id", id);
    if (error) { toast.error("Gagal"); return; }
    toast.success(`Status: ${newStatus}`);
    fetchData();
  };

  const deletePromotion = async (id: string) => {
    if (!confirm("Hapus iklan ini permanen?")) return;
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) { toast.error("Gagal hapus iklan"); return; }
    toast.success("Iklan dihapus");
    fetchData();
  };

  const uploadPromoImage = async (file: File): Promise<string | null> => {
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("promotions").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("promotions").getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (e: any) {
      toast.error(e.message || "Upload gagal");
      return null;
    }
  };

  const submitPromotion = async () => {
    if (!promoForm.title.trim()) { toast.error("Judul iklan wajib"); return; }
    if (!promoImageFile) { toast.error("Gambar iklan wajib"); return; }
    setPromoSubmitting(true);
    const imageUrl = await uploadPromoImage(promoImageFile);
    if (!imageUrl) { setPromoSubmitting(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const startDate = new Date();
    const endDate = new Date(Date.now() + 30 * 86400000);
    const { error } = await supabase.from("promotions").insert({
      title: promoForm.title,
      description: promoForm.description || null,
      link_url: promoForm.link_url || null,
      image_url: imageUrl,
      payment_method: "admin",
      status: "active",
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      user_id: user?.id,
    } as any);
    setPromoSubmitting(false);
    if (error) { toast.error("Gagal membuat iklan: " + error.message); return; }
    toast.success("Iklan dibuat (aktif 30 hari)");
    setShowPromoForm(false);
    setPromoForm({ title: "", description: "", link_url: "" });
    setPromoImageFile(null);
    fetchData();
  };

  // Listings
  const deleteListing = async (id: string) => {
    if (!confirm("Hapus listing ini permanen?")) return;
    const { error } = await supabase.from("market_listings").delete().eq("id", id);
    if (error) { toast.error("Gagal"); return; }
    toast.success("Listing dihapus");
    fetchData();
  };

  // Users
  const togglePremium = async (u: any) => {
    const newPremium = !u.is_premium;
    const endDate = newPremium ? new Date(Date.now() + 30 * 86400000).toISOString() : null;
    const { error } = await supabase.from("profiles").update({
      is_premium: newPremium, premium_until: endDate,
    } as any).eq("user_id", u.user_id);
    if (error) { toast.error("Gagal"); return; }
    if (newPremium) {
      await supabase.from("premium_subscriptions" as any).insert({
        user_id: u.user_id, source: "admin", end_date: endDate, status: "active",
      } as any);
    }
    toast.success(newPremium ? "Premium diaktifkan (30 hari)" : "Premium dinonaktifkan");
    fetchData();
  };

  const toggleBan = async (u: any) => {
    const { error } = await supabase.from("profiles").update({ is_banned: !u.is_banned } as any).eq("user_id", u.user_id);
    if (error) { toast.error("Gagal"); return; }
    toast.success(u.is_banned ? "Akun diaktifkan" : "Akun di-banned");
    fetchData();
  };

  const submitWarning = async () => {
    if (!warnTarget || !warnMessage.trim()) return;
    const { error } = await supabase.from("warnings" as any).insert({
      user_id: warnTarget.user_id, message: warnMessage,
    } as any);
    if (error) { toast.error("Gagal kirim peringatan"); return; }
    toast.success("Peringatan terkirim");
    setWarnTarget(null);
    setWarnMessage("");
  };

  // Rewards
  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("rewards").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("rewards").getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (e: any) {
      toast.error(e.message || "Upload gagal");
      return null;
    }
  };

  const submitReward = async () => {
    if (!rewardForm.brand || !rewardForm.name) { toast.error("Brand & nama wajib"); return; }
    const codes = rewardForm.codes.split("\n").map(c => c.trim()).filter(Boolean);
    if (codes.length === 0) { toast.error("Minimal 1 kode voucher"); return; }
    if (codes.length < rewardForm.stock) { toast.error("Jumlah kode harus >= stock"); return; }

    let imageUrl = rewardForm.image_url;
    if (imageFile) {
      const url = await handleImageUpload(imageFile);
      if (url) imageUrl = url;
    }

    const { data: created, error } = await supabase.from("rewards" as any).insert({
      brand: rewardForm.brand, name: rewardForm.name, description: rewardForm.description,
      image_url: imageUrl, points_cost: rewardForm.points_cost, stock: codes.length, is_active: true,
    } as any).select().single();
    if (error || !created) { toast.error("Gagal buat reward"); return; }

    const codeRows = codes.map(code => ({ reward_id: (created as any).id, code }));
    const { error: codesErr } = await supabase.from("reward_codes" as any).insert(codeRows as any);
    if (codesErr) { toast.error("Gagal upload kode"); return; }

    toast.success(`Reward dibuat dengan ${codes.length} kode`);
    setShowRewardForm(false);
    setRewardForm({ brand: "", name: "", description: "", points_cost: 100, stock: 1, codes: "", image_url: "" });
    setImageFile(null);
    fetchData();
  };

  const toggleRewardActive = async (r: any) => {
    await supabase.from("rewards" as any).update({ is_active: !r.is_active } as any).eq("id", r.id);
    fetchData();
  };

  const deleteReward = async (id: string) => {
    if (!confirm("Hapus reward ini? Semua kode terkait juga ikut terhapus.")) return;
    await supabase.from("rewards" as any).delete().eq("id", id);
    toast.success("Reward dihapus");
    fetchData();
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-2xl p-8 w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <Shield className="w-7 h-7 text-destructive" />
            </div>
            <h1 className="text-xl font-extrabold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground text-center">Masukkan password admin</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Password"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={handleLogin}
            className="w-full rosi-gradient text-primary-foreground py-3 rounded-xl font-bold text-sm">
            Masuk
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-destructive" /> Admin Panel
              </h1>
              <p className="text-xs text-muted-foreground">Kelola Rosy App</p>
            </div>
          </div>
          <button onClick={fetchData} disabled={loading} className="p-2 rounded-lg bg-muted hover:bg-muted/80">
            <RefreshCw className={`w-4 h-4 text-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: "promotions" as const, label: "Iklan", icon: Megaphone, count: promotions.length },
            { key: "listings" as const, label: "Market", icon: ShoppingBag, count: listings.length },
            { key: "users" as const, label: "Users", icon: Users, count: users.length },
            { key: "rewards" as const, label: "Reward", icon: Gift, count: rewards.length },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.key ? "rosi-gradient text-primary-foreground" : "bg-card border border-border text-foreground"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Promotions */}
        {activeTab === "promotions" && (
          <div className="space-y-3">
            <button onClick={() => setShowPromoForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl rosi-gradient text-primary-foreground text-sm font-bold">
              <Plus className="w-4 h-4" /> Tambah Iklan
            </button>
            {promotions.length === 0 ? <p className="text-center py-10 text-muted-foreground text-sm">Belum ada iklan</p>
            : promotions.map((promo) => {
              const daysLeft = promo.end_date
                ? Math.max(0, Math.ceil((new Date(promo.end_date).getTime() - Date.now()) / 86400000))
                : null;
              return (
              <div key={promo.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                {promo.image_url && (
                  <img src={promo.image_url} alt={promo.title} className="w-full h-32 object-cover rounded-lg" />
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{promo.title}</p>
                    <p className="text-xs text-muted-foreground">{promo.description || "-"}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold whitespace-nowrap ${
                    promo.status === "active" ? "bg-green-100 text-green-700" :
                    promo.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                  }`}>{promo.status}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Method: {promo.payment_method}</p>
                  {promo.link_url && <p className="truncate">🔗 {promo.link_url}</p>}
                  {daysLeft !== null && (
                    <p className={daysLeft <= 3 ? "text-destructive font-semibold" : ""}>
                      ⏱ Sisa {daysLeft} hari
                    </p>
                  )}
                  {promo.tx_hash && <p>Tx: {promo.tx_hash.slice(0, 15)}...</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => togglePromotionStatus(promo.id, promo.status)}
                    className="flex items-center justify-center gap-1 py-2 rounded-lg bg-muted text-foreground text-xs font-bold">
                    {promo.status === "active" ? <><EyeOff className="w-3 h-3" /> Nonaktifkan</> : <><Eye className="w-3 h-3" /> Aktifkan</>}
                  </button>
                  <button onClick={() => deletePromotion(promo.id)}
                    className="flex items-center justify-center gap-1 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-bold">
                    <Trash2 className="w-3 h-3" /> Hapus
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Listings */}
        {activeTab === "listings" && (
          <div className="space-y-3">
            {listings.length === 0 ? <p className="text-center py-10 text-muted-foreground text-sm">Belum ada listing</p>
            : listings.map((listing) => (
              <div key={listing.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  {listing.image_urls?.[0] && <img src={listing.image_urls[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />}
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{listing.title}</p>
                    <p className="text-xs text-muted-foreground">{listing.waste_type} • Rp {listing.price?.toLocaleString("id-ID")}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      listing.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>{listing.status}</span>
                  </div>
                  <button onClick={() => deleteListing(listing.id)} className="p-2 rounded-lg bg-destructive/10 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <div className="space-y-3">
            {users.length === 0 ? <p className="text-center py-10 text-muted-foreground text-sm">Belum ada user</p>
            : users.map((u) => (
              <div key={u.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> :
                    <span className="text-sm font-bold text-muted-foreground">{(u.nickname || "U")[0].toUpperCase()}</span>}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      {u.nickname || "User"}
                      {u.is_premium && <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                      {u.is_official && <Shield className="w-3 h-3 text-blue-500" />}
                      {u.is_banned && <Ban className="w-3 h-3 text-destructive" />}
                    </p>
                    <p className="text-[10px] text-muted-foreground">L{u.level} • {u.points} pts • {u.total_scans} scans • {u.total_recycled_kg}kg</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button onClick={() => togglePremium(u)}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold ${
                      u.is_premium ? "bg-yellow-500/15 text-yellow-700" : "bg-muted text-foreground"
                    }`}>
                    <Crown className="w-3 h-3" /> {u.is_premium ? "Cabut Premium" : "Premium 30d"}
                  </button>
                  <button onClick={() => setWarnTarget(u)}
                    className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-orange-500/15 text-orange-700 text-[10px] font-bold">
                    <AlertTriangle className="w-3 h-3" /> Warn
                  </button>
                  <button onClick={() => toggleBan(u)}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold ${
                      u.is_banned ? "bg-muted text-foreground" : "bg-destructive/10 text-destructive"
                    }`}>
                    <Ban className="w-3 h-3" /> {u.is_banned ? "Unban" : "Ban"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rewards */}
        {activeTab === "rewards" && (
          <div className="space-y-3">
            <button onClick={() => setShowRewardForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl rosi-gradient text-primary-foreground text-sm font-bold">
              <Plus className="w-4 h-4" /> Tambah Reward
            </button>
            {rewards.length === 0 ? <p className="text-center py-10 text-muted-foreground text-sm">Belum ada reward</p>
            : rewards.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-3 flex gap-3">
                {r.image_url ? <img src={r.image_url} alt={r.name} className="w-16 h-16 rounded-lg object-cover" />
                : <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center"><Gift className="w-6 h-6 text-muted-foreground" /></div>}
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-primary uppercase">{r.brand}</p>
                  <p className="text-sm font-bold text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.points_cost} pts • Stok: {r.stock}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => toggleRewardActive(r)}
                      className="text-[10px] px-2 py-1 rounded bg-muted text-foreground font-bold">
                      {r.is_active ? "Nonaktif" : "Aktifkan"}
                    </button>
                    <button onClick={() => deleteReward(r.id)}
                      className="text-[10px] px-2 py-1 rounded bg-destructive/10 text-destructive font-bold flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reward Form Modal */}
      {showRewardForm && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center px-4 py-6 overflow-y-auto">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-2xl p-6 w-full max-w-md space-y-3 my-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Tambah Reward</h3>
              <button onClick={() => setShowRewardForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <input value={rewardForm.brand} onChange={(e) => setRewardForm({ ...rewardForm, brand: e.target.value })} placeholder="Brand (e.g. Tokopedia)"
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm" />
            <input value={rewardForm.name} onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })} placeholder="Nama (e.g. Voucher Rp 50rb)"
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm" />
            <textarea value={rewardForm.description} onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })} placeholder="Deskripsi" rows={2}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm resize-none" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={rewardForm.points_cost} onChange={(e) => setRewardForm({ ...rewardForm, points_cost: parseInt(e.target.value) || 0 })} placeholder="Poin"
                className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm" />
              <label className="flex items-center justify-center gap-2 bg-background border border-border rounded-xl px-3 py-2.5 text-xs cursor-pointer text-foreground">
                <Upload className="w-3 h-3" /> {imageFile ? imageFile.name.slice(0, 12) : "Upload Image"}
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">Kode voucher (1 per baris). Jumlah kode = stok.</p>
              <textarea value={rewardForm.codes} onChange={(e) => setRewardForm({ ...rewardForm, codes: e.target.value })}
                placeholder={"VOUCHER-001\nVOUCHER-002\n..."} rows={4}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm resize-none font-mono" />
            </div>
            <button onClick={submitReward}
              className="w-full rosi-gradient text-primary-foreground py-3 rounded-xl font-bold text-sm">
              Buat Reward
            </button>
          </motion.div>
        </div>
      )}

      {/* Warn Modal */}
      {warnTarget && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center px-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-2xl p-6 w-full max-w-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" /> Peringatan
              </h3>
              <button onClick={() => setWarnTarget(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <p className="text-xs text-muted-foreground">Untuk: <strong>{warnTarget.nickname || "User"}</strong></p>
            <textarea value={warnMessage} onChange={(e) => setWarnMessage(e.target.value)}
              placeholder="Pesan peringatan..." rows={4}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm resize-none" />
            <button onClick={submitWarning}
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold text-sm">
              Kirim Peringatan
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
