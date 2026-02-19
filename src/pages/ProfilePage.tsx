import { motion } from "framer-motion";
import { Settings, LogOut, History, ShoppingBag, Scan, Recycle, Star, ChevronRight, Megaphone } from "lucide-react";

const ProfilePage = () => {
  const stats = [
    { label: "POINTS", value: "0" },
    { label: "RECYCLER", value: "Level 1", badge: true },
  ];

  const menuItems = [
    { icon: Megaphone, label: "Advertise with Us", sub: "Promote your business on ROSi", action: true },
    { icon: History, label: "Riwayat Scan", sub: "" },
    { icon: ShoppingBag, label: "Riwayat Transaksi", sub: "" },
    { icon: Settings, label: "Settings", sub: "" },
  ];

  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Avatar & Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center"
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-muted border-4 border-primary/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-muted-foreground">?</span>
          </div>
        </div>
        <h2 className="text-xl font-extrabold text-foreground mt-3">Guest User</h2>
        <p className="text-sm text-muted-foreground">Masuk untuk menyimpan data</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl p-3 text-center border ${
              stat.badge ? "border-primary bg-secondary" : "border-border bg-card"
            }`}
          >
            <p className={`text-lg font-extrabold ${stat.badge ? "text-primary" : "text-foreground"}`}>
              {stat.value}
            </p>
            <p className="text-[10px] font-bold text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Statistics */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-foreground">Statistik Kamu</h3>
        <div className="space-y-2">
          {[
            { icon: Scan, label: "Total Scan", value: "0" },
            { icon: Recycle, label: "Sampah Terselamatkan", value: "0 kg" },
            { icon: Star, label: "Poin ROSi", value: "0" },
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
        {menuItems.map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-left"
          >
            <item.icon className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              {item.sub && <p className="text-xs text-muted-foreground">{item.sub}</p>}
            </div>
            {item.action ? (
              <span className="px-3 py-1 rounded-full border border-primary text-primary text-xs font-bold">Pay Now</span>
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        ))}

        {/* Logout */}
        <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/10 transition-colors">
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="text-sm font-semibold text-destructive">Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
