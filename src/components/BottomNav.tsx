import { useLocation, useNavigate } from "react-router-dom";
import { Home, ShoppingBag, MessageCircle, User, Scan } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import rosyHead from "@/assets/rosy-head.png";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const navItems = [
    { path: "/", label: t("nav.home"), icon: Home },
    { path: "/market", label: t("nav.market"), icon: ShoppingBag },
    { path: "/scan", label: t("nav.scan"), icon: Scan, center: true },
    { path: "/chat", label: t("nav.chat"), icon: MessageCircle },
    { path: "/profile", label: t("nav.profile"), icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-end justify-around px-2 pb-[env(safe-area-inset-bottom,0px)] max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.center) {
            return (
              <button key={item.path} onClick={() => navigate(item.path)} className="relative -mt-5 flex flex-col items-center">
                <motion.img
                  src={rosyHead}
                  alt="Rosy"
                  initial={{ y: 4 }}
                  animate={{ y: [4, -2, 4] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-7 w-9 h-9 object-contain pointer-events-none select-none drop-shadow"
                />
                <motion.div whileTap={{ scale: 0.9 }}
                  className={`w-14 h-14 rounded-full rosi-gradient flex items-center justify-center shadow-lg ${isActive ? "animate-pulse-green" : ""}`}>
                  <Icon className="w-7 h-7 text-primary-foreground" />
                </motion.div>
                <span className={`text-[10px] mt-1 font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>{item.label}</span>
              </button>
            );
          }

          return (
            <button key={item.path} onClick={() => navigate(item.path)} className="flex flex-col items-center py-2 px-3 min-w-[60px]">
              <Icon className={`w-6 h-6 ${isActive ? "text-primary" : "text-muted-foreground"}`} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] mt-1 font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
