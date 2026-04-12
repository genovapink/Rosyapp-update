import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Trash2, Eye, EyeOff, Ban, CheckCircle, ShoppingBag, Megaphone, Users, ArrowLeft, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ADMIN_PASSWORD = "317130G";

const AdminPage = () => {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"promotions" | "listings" | "users">("promotions");
  const [promotions, setPromotions] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
    const [promoRes, listRes, userRes] = await Promise.all([
      supabase.from("promotions").select("*").order("created_at", { ascending: false }),
      supabase.from("market_listings").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]);
    setPromotions((promoRes.data || []) as any[]);
    setListings((listRes.data || []) as any[]);
    setUsers((userRes.data || []) as any[]);
    setLoading(false);
  };

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated]);

  const deletePromotion = async (id: string) => {
    // Use update to set status to expired since we can't delete
    const { error } = await supabase.from("promotions").update({ status: "expired" } as any).eq("id", id);
    if (error) { toast.error("Gagal"); return; }
    toast.success("Iklan dinonaktifkan");
    fetchData();
  };

  const togglePromotionStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "expired" : "active";
    const { error } = await supabase.from("promotions").update({ status: newStatus } as any).eq("id", id);
    if (error) { toast.error("Gagal"); return; }
    toast.success(`Status diubah ke ${newStatus}`);
    fetchData();
  };

  const deleteListing = async (id: string) => {
    const { error } = await supabase.from("market_listings").update({ status: "deleted" } as any).eq("id", id);
    if (error) { toast.error("Gagal"); return; }
    toast.success("Listing dihapus");
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
          <button onClick={fetchData} disabled={loading}
            className="p-2 rounded-lg bg-muted hover:bg-muted/80">
            <RefreshCw className={`w-4 h-4 text-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: "promotions" as const, label: "Iklan", icon: Megaphone, count: promotions.length },
            { key: "listings" as const, label: "Market", icon: ShoppingBag, count: listings.length },
            { key: "users" as const, label: "Users", icon: Users, count: users.length },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.key ? "rosi-gradient text-primary-foreground" : "bg-card border border-border text-foreground"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Promotions Tab */}
        {activeTab === "promotions" && (
          <div className="space-y-3">
            {promotions.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground text-sm">Belum ada iklan</p>
            ) : promotions.map((promo) => (
              <div key={promo.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">{promo.title}</p>
                    <p className="text-xs text-muted-foreground">{promo.description || "-"}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                    promo.status === "active" ? "bg-green-100 text-green-700" : 
                    promo.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                  }`}>
                    {promo.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Method: {promo.payment_method}</p>
                  {promo.wallet_address && <p>Wallet: {promo.wallet_address.slice(0, 10)}...</p>}
                  {promo.tx_hash && <p>Tx: {promo.tx_hash.slice(0, 15)}...</p>}
                  {promo.start_date && <p>Start: {new Date(promo.start_date).toLocaleDateString("id-ID")}</p>}
                  {promo.end_date && <p>End: {new Date(promo.end_date).toLocaleDateString("id-ID")}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => togglePromotionStatus(promo.id, promo.status)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-muted text-foreground text-xs font-bold">
                    {promo.status === "active" ? <><EyeOff className="w-3 h-3" /> Nonaktifkan</> : <><Eye className="w-3 h-3" /> Aktifkan</>}
                  </button>
                  <button onClick={() => deletePromotion(promo.id)}
                    className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-bold">
                    <Ban className="w-3 h-3" /> Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Listings Tab */}
        {activeTab === "listings" && (
          <div className="space-y-3">
            {listings.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground text-sm">Belum ada listing</p>
            ) : listings.map((listing) => (
              <div key={listing.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  {listing.image_urls?.[0] && (
                    <img src={listing.image_urls[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{listing.title}</p>
                    <p className="text-xs text-muted-foreground">{listing.waste_type} • Rp {listing.price?.toLocaleString("id-ID")}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      listing.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {listing.status}
                    </span>
                  </div>
                  <button onClick={() => deleteListing(listing.id)}
                    className="p-2 rounded-lg bg-destructive/10 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-3">
            {users.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground text-sm">Belum ada user</p>
            ) : users.map((u) => (
              <div key={u.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-bold text-muted-foreground">
                    {(u.nickname || "U")[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{u.nickname || "User"}</p>
                  <p className="text-xs text-muted-foreground">Level {u.level} • {u.points} pts • {u.total_scans} scans</p>
                </div>
                <div className="text-xs text-muted-foreground">{u.total_recycled_kg} kg</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
