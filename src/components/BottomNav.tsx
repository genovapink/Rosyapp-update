import { useLocation, useNavigate } from "react-router-dom";
import { Home, ShoppingBag, MessageCircle, User, Scan } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/market", label: "Market", icon: ShoppingBag },
  { path: "/scan", label: "Scan", icon: Scan, center: true },
  { path: "/chat", label: "Chat", icon: MessageCircle },
  { path: "/profile", label: "Profil", icon: User },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-end justify-around px-2 pb-[env(safe-area-inset-bottom,0px)] max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.center) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative -mt-5 flex flex-col items-center"
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`w-14 h-14 rounded-full rosi-gradient flex items-center justify-center shadow-lg ${
                    isActive ? "animate-pulse-green" : ""
                  }`}
                >
                  <Icon className="w-7 h-7 text-primary-foreground" />
                </motion.div>
                <span className={`text-[10px] mt-1 font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center py-2 px-3 min-w-[60px]"
            >
              <Icon
                className={`w-6 h-6 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] mt-1 font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
