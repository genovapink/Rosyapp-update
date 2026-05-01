import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scan, ShoppingBag, Leaf, Recycle, TrendingUp, ArrowRight, BookOpen, ChevronLeft, ChevronRight, BadgeCheck, MessageCircle } from "lucide-react";
import LanguageMenu from "@/components/LanguageMenu";
import rosiLogo from "@/assets/rosi-logo.png";
import rosyRecycle from "@/assets/rosy-recycle.png";
import rosyTrioBg from "@/assets/rosy-trio-bg.png";
import rosyBook from "@/assets/rosy-book.png";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";

const ROSY_OFFICIAL_ID = "352cfaa2-1cbb-4abd-90e3-9e7f349d9cfd";

const HomePage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [globalStats, setGlobalStats] = useState({ scans: 0, recycled: 0, users: 0 });
  const [activeAds, setActiveAds] = useState<any[]>([]);
  const [adIndex, setAdIndex] = useState(0);

  const fetchHomeData = async () => {
    const [scansRes, profilesRes, adsRes] = await Promise.all([
      supabase.from("scan_results").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id, total_recycled_kg"),
      supabase.from("promotions").select("*").eq("status", "active"),
    ]);
    const profiles = (profilesRes.data || []) as any[];
    const totalRecycled = profiles.reduce((acc: number, p: any) => acc + (Number(p.total_recycled_kg) || 0), 0);
    setGlobalStats({ scans: scansRes.count || 0, recycled: totalRecycled, users: profiles.length });
    const now = new Date();
    const ads = ((adsRes.data || []) as any[]).filter((ad: any) => ad.end_date && new Date(ad.end_date) > now);
    setActiveAds(ads);
  };

  const categories = [
    { name: t("cat.plastik"), icon: "♻️" },
    { name: t("cat.kaca"), icon: "🫙" },
    { name: t("cat.kertas"), icon: "📄" },
    { name: t("cat.logam"), icon: "🔩" },
    { name: t("cat.organik"), icon: "🍂" },
    { name: t("cat.elektronik"), icon: "💻" },
  ];

  useEffect(() => {
    fetchHomeData();

    const channel = supabase
      .channel("home-realtime-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchHomeData)
      .on("postgres_changes", { event: "*", schema: "public", table: "scan_results" }, fetchHomeData)
      .on("postgres_changes", { event: "*", schema: "public", table: "promotions" }, fetchHomeData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleContactOfficial = async () => {
    if (!user) { navigate("/auth"); return; }
    const { data: existing } = await supabase.from("conversations").select("id")
      .or(`and(buyer_id.eq.${user.id},seller_id.eq.${ROSY_OFFICIAL_ID}),and(buyer_id.eq.${ROSY_OFFICIAL_ID},seller_id.eq.${user.id})`);
    if (existing && existing.length > 0) {
      navigate(`/chat?conversation=${existing[0].id}`);
    } else {
      const { data: newConv } = await supabase.from("conversations")
        .insert({ buyer_id: user.id, seller_id: ROSY_OFFICIAL_ID } as any).select().single();
      if (newConv) navigate(`/chat?conversation=${(newConv as any).id}`);
    }
  };

  const stats = [
    { label: t("home.stats.scans"), value: String(globalStats.scans), icon: Scan },
    { label: t("home.stats.recycled"), value: `${globalStats.recycled}`, icon: Recycle },
    { label: t("home.stats.users"), value: String(globalStats.users), icon: TrendingUp },
  ];

  return (
    <div className="px-4 pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={rosiLogo} alt="Rosy Logo" className="w-10 h-10" />
          <h1 className="text-2xl font-extrabold text-foreground">Rosy</h1>
        </div>
        <div className="flex items-center gap-2">
          {user && <p className="text-xs text-muted-foreground">{t("home.hi")}, {profile?.nickname || "User"}!</p>}
          <LanguageMenu />
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 text-primary-foreground relative overflow-hidden min-h-[200px]">
        <img src={rosyTrioBg} alt="Rosy characters" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/55 to-transparent" />
        <div className="relative z-10">
          <h2 className="text-xl font-extrabold leading-tight mb-2 whitespace-pre-line">{t("home.hero.title").replace(/🌍|🌎|🌏/g, "").trim()}</h2>
          <p className="text-sm opacity-90 mb-4">{t("home.hero.subtitle")}</p>
          <button onClick={() => navigate("/scan")}
            className="bg-card text-primary font-bold px-6 py-2.5 rounded-full text-sm flex items-center gap-2 shadow-md">
            <Scan className="w-4 h-4" /> {t("home.hero.button")}
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        onClick={() => navigate("/rosycourse")}
        className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow relative">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img src={rosyBook} alt="Trash Lesson" className="w-9 h-9 object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-extrabold text-foreground">{t("home.trash_lesson")}</p>
            <Badge variant="destructive" className="text-[9px] px-1.5 py-0">NEW</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{t("home.trash_lesson.desc")}</p>
          <p className="text-[10px] text-primary font-semibold">+ Rosy Poin</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </motion.div>

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

      <div className="bg-muted border border-border rounded-xl overflow-hidden min-h-[200px] relative">
        {activeAds.length > 0 ? (
          <>
            <AnimatePresence mode="wait">
              <motion.div key={adIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                {activeAds[adIndex].image_url && (
                  activeAds[adIndex].link_url ? (
                    <a href={activeAds[adIndex].link_url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={activeAds[adIndex].image_url} alt={activeAds[adIndex].title} className="w-full h-40 object-cover cursor-pointer hover:opacity-90 transition" />
                    </a>
                  ) : (
                    <img src={activeAds[adIndex].image_url} alt={activeAds[adIndex].title} className="w-full h-40 object-cover" />
                  )
                )}
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{activeAds[adIndex].title}</p>
                    <Badge className="text-[9px] px-1.5 py-0 bg-accent text-accent-foreground">Promoted</Badge>
                  </div>
                  {activeAds[adIndex].description && (
                    <p className="text-xs text-muted-foreground mt-1">{activeAds[adIndex].description}</p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
            {activeAds.length > 1 && (
              <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-2 pointer-events-none">
                <button onClick={() => setAdIndex((prev) => (prev - 1 + activeAds.length) % activeAds.length)}
                  className="pointer-events-auto w-7 h-7 bg-card/80 rounded-full flex items-center justify-center shadow">
                  <ChevronLeft className="w-4 h-4 text-foreground" />
                </button>
                <button onClick={() => setAdIndex((prev) => (prev + 1) % activeAds.length)}
                  className="pointer-events-auto w-7 h-7 bg-card/80 rounded-full flex items-center justify-center shadow">
                  <ChevronRight className="w-4 h-4 text-foreground" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <div className="w-10 h-10 bg-muted-foreground/10 rounded-lg flex items-center justify-center mb-2">
              <ShoppingBag className="w-5 h-5 opacity-40" />
            </div>
            <p className="text-sm font-semibold">{t("home.ad_space")}</p>
            <p className="text-xs">{t("home.ad_contact")}</p>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-foreground">{t("home.categories.title")}</h3>
          <motion.img
            src={rosyRecycle}
            alt="Rosy recycle"
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-14 h-14 object-contain drop-shadow"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat, i) => (
            <motion.div key={cat.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 * i }}
              className="bg-card border border-border rounded-xl p-3 text-center">
              <span className="text-2xl grayscale">{cat.icon}</span>
              <p className="text-xs font-semibold mt-1 text-foreground">{cat.name}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate("/scan")} className="rosi-gradient text-primary-foreground rounded-xl p-4 text-left">
          <Scan className="w-6 h-6 mb-2" />
          <p className="text-sm font-bold">{t("home.scan_waste")}</p>
          <ArrowRight className="w-4 h-4 mt-1 opacity-70" />
        </button>
        <button onClick={() => navigate("/market")} className="bg-card border border-border text-foreground rounded-xl p-4 text-left">
          <ShoppingBag className="w-6 h-6 mb-2 text-primary" />
          <p className="text-sm font-bold">{t("home.market_waste")}</p>
          <ArrowRight className="w-4 h-4 mt-1 text-muted-foreground" />
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-2">{t("home.suggestion")}</p>
        <button onClick={handleContactOfficial} className="flex items-center gap-2 w-full text-left">
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-secondary-foreground">R</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-foreground">Rosy Official</span>
              <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500" />
            </div>
            <p className="text-[10px] text-muted-foreground">{t("home.send_message")}</p>
          </div>
          <MessageCircle className="w-5 h-5 text-primary" />
        </button>
      </div>

      <div className="text-center py-4 text-muted-foreground text-xs space-y-1">
        <div className="flex items-center justify-center gap-1">
          <Leaf className="w-3 h-3" />
          <span className="font-semibold">{t("footer.tagline")}</span>
        </div>
        <p>Developed by @4anakmasadepan</p>
      </div>
    </div>
  );
};

export default HomePage;
