import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Scan, ShoppingBag, Leaf, Recycle, TrendingUp, ArrowRight } from "lucide-react";
import rosiLogo from "@/assets/rosi-logo.png";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const categories = [
  { name: "Plastik", emoji: "♻️" },
  { name: "Kaca", emoji: "🫙" },
  { name: "Kertas", emoji: "📄" },
  { name: "Logam", emoji: "🔩" },
  { name: "Organik", emoji: "🍂" },
  { name: "Elektronik", emoji: "💻" },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [globalStats, setGlobalStats] = useState({ scans: 0, recycled: 0, users: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [scansRes, profilesRes] = await Promise.all([
        supabase.from("scan_results" as any).select("id", { count: "exact", head: true }),
        supabase.from("profiles" as any).select("id, total_recycled_kg"),
      ]);

      const profiles = (profilesRes.data || []) as any[];
      const totalRecycled = profiles.reduce((acc: number, p: any) => acc + (Number(p.total_recycled_kg) || 0), 0);

      setGlobalStats({
        scans: scansRes.count || 0,
        recycled: totalRecycled,
        users: profiles.length,
      });
    };
    fetchStats();
  }, []);

  const stats = [
    { label: "Sampah Di-scan", value: String(globalStats.scans), icon: Scan },
    { label: "Didaur Ulang", value: `${globalStats.recycled}`, icon: Recycle },
    { label: "Pengguna Aktif", value: String(globalStats.users), icon: TrendingUp },
  ];

  return (
    <div className="px-4 pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={rosiLogo} alt="ROSi Logo" className="w-10 h-10" />
          <h1 className="text-2xl font-extrabold text-foreground">ROSi</h1>
        </div>
        {user && (
          <p className="text-xs text-muted-foreground">Hi, {profile?.nickname || "User"}!</p>
        )}
      </div>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rosi-gradient rounded-2xl p-6 text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(110_40%_50%/0.3)] rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-[hsl(110_40%_50%/0.2)] rounded-full translate-y-6 -translate-x-6" />
        <div className="relative z-10">
          <h2 className="text-xl font-extrabold leading-tight mb-2">Scan Sampahmu,{"\n"}Selamatkan Bumi 🌍</h2>
          <p className="text-sm opacity-90 mb-4">Dapatkan Poin ROSi & bantu kurangi sampah</p>
          <button onClick={() => navigate("/scan")}
            className="bg-card text-primary font-bold px-6 py-2.5 rounded-full text-sm flex items-center gap-2 shadow-md">
            <Scan className="w-4 h-4" /> Scan Sekarang
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
            className="bg-card rounded-xl p-3 text-center border border-border">
            <stat.icon className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-extrabold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Ad Banner */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="w-[300px] h-[250px] mx-auto flex items-center justify-center bg-muted">
          <div className="text-center text-muted-foreground">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold">Ruang Iklan 300×250</p>
            <p className="text-[10px]">Hubungi kami untuk beriklan</p>
          </div>
        </div>
      </div>

      {/* Education */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-3">Kenali Sampahmu</h3>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat, i) => (
            <motion.div key={cat.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 * i }}
              className="bg-card border border-border rounded-xl p-3 text-center">
              <span className="text-2xl">{cat.emoji}</span>
              <p className="text-xs font-semibold mt-1 text-foreground">{cat.name}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate("/scan")} className="rosi-gradient text-primary-foreground rounded-xl p-4 text-left">
          <Scan className="w-6 h-6 mb-2" />
          <p className="text-sm font-bold">Scan Sampah</p>
          <ArrowRight className="w-4 h-4 mt-1 opacity-70" />
        </button>
        <button onClick={() => navigate("/market")} className="bg-card border border-border text-foreground rounded-xl p-4 text-left">
          <ShoppingBag className="w-6 h-6 mb-2 text-primary" />
          <p className="text-sm font-bold">Market Sampah</p>
          <ArrowRight className="w-4 h-4 mt-1 text-muted-foreground" />
        </button>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-muted-foreground text-xs space-y-1">
        <div className="flex items-center justify-center gap-1">
          <Leaf className="w-3 h-3" />
          <span className="font-semibold">Reduce • Reuse • Recycle</span>
        </div>
        <p>Developed by @4anakmasadepan</p>
      </div>
    </div>
  );
};

export default HomePage;
