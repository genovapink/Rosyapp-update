import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Filter, MapPin } from "lucide-react";

interface MarketItem {
  id: string;
  name: string;
  type: string;
  weight: string;
  price: string;
  seller: string;
  location: string;
  image: string;
}

const sampleItems: MarketItem[] = [];

const wasteTypes = ["Semua", "Plastik", "Kaca", "Kertas", "Logam", "Organik", "Elektronik"];

const MarketPage = () => {
  const [activeFilter, setActiveFilter] = useState("Semua");
  const [showNewListing, setShowNewListing] = useState(false);

  return (
    <div className="px-4 pt-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Marketplace</h1>
          <p className="text-sm text-muted-foreground">Jual beli sampah bernilai</p>
        </div>
        <button
          onClick={() => setShowNewListing(true)}
          className="w-10 h-10 rosi-gradient rounded-full flex items-center justify-center shadow-md"
        >
          <Plus className="w-5 h-5 text-primary-foreground" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Cari sampah..."
          className="w-full bg-card border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {wasteTypes.map((type) => (
          <button
            key={type}
            onClick={() => setActiveFilter(type)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeFilter === type
                ? "rosi-gradient text-primary-foreground"
                : "bg-card border border-border text-foreground"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Items */}
      <AnimatePresence mode="wait">
        {sampleItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-muted-foreground"
          >
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm font-semibold">Belum ada listing</p>
            <p className="text-xs mt-1">Jadilah yang pertama menjual!</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sampleItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <div className="aspect-square bg-muted" />
                <div className="p-3">
                  <p className="text-sm font-bold text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.weight}</p>
                  <p className="text-sm font-extrabold text-primary mt-1">{item.price}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketPage;
