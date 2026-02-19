import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Filter, MapPin, X, Upload, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

interface MarketItem {
  id: string;
  title: string;
  description: string | null;
  waste_type: string;
  weight_kg: number | null;
  price: number;
  location: string | null;
  image_urls: string[];
  user_id: string;
  created_at: string;
  seller_nickname?: string;
}

const wasteTypes = ["Semua", "Plastik", "Kaca", "Kertas", "Logam", "Organik", "Elektronik"];
const wasteTypeMap: Record<string, string> = {
  Plastik: "plastic", Kaca: "glass", Kertas: "paper", Logam: "metal", Organik: "organic", Elektronik: "ewaste",
};

const MarketPage = () => {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [activeFilter, setActiveFilter] = useState("Semua");
  const [showNewListing, setShowNewListing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // New listing form state
  const [title, setTitle] = useState(searchParams.get("name") || "");
  const [description, setDescription] = useState("");
  const [wasteType, setWasteType] = useState(searchParams.get("category") || "plastic");
  const [weightKg, setWeightKg] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from scan
  useEffect(() => {
    const scanImage = searchParams.get("image");
    if (scanImage) {
      setPreviewUrls([scanImage]);
    }
    if (searchParams.get("scan_id")) {
      setShowNewListing(true);
    }
  }, [searchParams]);

  const fetchItems = async () => {
    setLoading(true);
    let query = supabase.from("market_listings" as any).select("*").eq("status", "active").order("created_at", { ascending: false });

    if (activeFilter !== "Semua") {
      const mappedType = wasteTypeMap[activeFilter];
      if (mappedType) query = query.eq("waste_type", mappedType);
    }

    const { data, error } = await query;
    if (error) { console.error(error); setLoading(false); return; }

    // Fetch seller nicknames
    const userIds = [...new Set((data as any[]).map((d: any) => d.user_id))];
    let profiles: any[] = [];
    if (userIds.length > 0) {
      const { data: p } = await supabase.from("profiles" as any).select("user_id, nickname").in("user_id", userIds);
      profiles = (p || []) as any[];
    }

    const enriched = (data as any[]).map((item: any) => ({
      ...item,
      image_urls: item.image_urls || [],
      seller_nickname: profiles.find((p: any) => p.user_id === item.user_id)?.nickname || "User",
    }));

    setItems(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [activeFilter]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 3);
    setImageFiles(files);
    setPreviewUrls(files.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Silakan login terlebih dahulu"); navigate("/auth"); return; }
    setSubmitting(true);

    try {
      // Upload images
      const uploadedUrls: string[] = [];
      
      // Include scan image if exists
      const scanImage = searchParams.get("image");
      if (scanImage) uploadedUrls.push(scanImage);

      for (const file of imageFiles) {
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("waste-images").upload(fileName, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("waste-images").getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }

      const { error } = await supabase.from("market_listings" as any).insert({
        user_id: user.id,
        title,
        description,
        waste_type: wasteType,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        price: parseInt(price) || 0,
        location,
        image_urls: uploadedUrls.slice(0, 3),
        scan_result_id: searchParams.get("scan_id") || null,
      } as any);

      if (error) throw error;
      toast.success("Listing berhasil dibuat!");
      setShowNewListing(false);
      setTitle(""); setDescription(""); setWeightKg(""); setPrice(""); setLocation("");
      setImageFiles([]); setPreviewUrls([]);
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat listing");
    } finally {
      setSubmitting(false);
    }
  };

  const startChat = async (item: MarketItem) => {
    if (!user) { toast.error("Login dulu"); navigate("/auth"); return; }
    if (item.user_id === user.id) { toast.info("Ini listing kamu sendiri"); return; }

    // Find or create conversation
    const { data: existing } = await supabase
      .from("conversations" as any)
      .select("*")
      .eq("listing_id", item.id)
      .eq("buyer_id", user.id)
      .eq("seller_id", item.user_id)
      .maybeSingle();

    let conversationId: string;
    if (existing) {
      conversationId = (existing as any).id;
    } else {
      const { data: newConv, error } = await supabase.from("conversations" as any).insert({
        listing_id: item.id,
        buyer_id: user.id,
        seller_id: item.user_id,
      } as any).select().single();
      if (error) { toast.error("Gagal memulai chat"); return; }
      conversationId = (newConv as any).id;
    }
    navigate(`/chat?conversation=${conversationId}`);
  };

  // Detail view
  if (selectedItem) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <button onClick={() => setSelectedItem(null)} className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        {selectedItem.image_urls.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {selectedItem.image_urls.map((url, i) => (
              <img key={i} src={url} alt="" className="w-full max-w-[300px] aspect-square object-cover rounded-xl border border-border flex-shrink-0" />
            ))}
          </div>
        )}
        <div className="space-y-3">
          <h1 className="text-xl font-extrabold text-foreground">{selectedItem.title}</h1>
          <p className="text-2xl font-extrabold text-primary">Rp {selectedItem.price.toLocaleString()}</p>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-bold">{selectedItem.waste_type}</span>
            {selectedItem.weight_kg && <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-bold">{selectedItem.weight_kg} kg</span>}
          </div>
          {selectedItem.location && <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedItem.location}</p>}
          {selectedItem.description && <p className="text-sm text-foreground">{selectedItem.description}</p>}
          <p className="text-xs text-muted-foreground">Dijual oleh: {selectedItem.seller_nickname}</p>
          <button onClick={() => startChat(selectedItem)}
            className="w-full rosi-gradient text-primary-foreground py-3 rounded-xl font-bold text-sm">
            💬 Chat Penjual
          </button>
        </div>
      </div>
    );
  }

  // New listing form
  if (showNewListing) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-foreground">Jual Sampah</h1>
          <button onClick={() => setShowNewListing(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nama barang" required
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi" rows={3}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          <select value={wasteType} onChange={(e) => setWasteType(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="Berat (kg)" type="number" step="0.1"
              className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Harga (Rp)" type="number" required
              className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lokasi"
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          
          {/* Image upload */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Foto (maks 3)</p>
            {previewUrls.length > 0 && (
              <div className="flex gap-2 mb-2">
                {previewUrls.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-border" />
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-primary font-semibold cursor-pointer">
              <Upload className="w-4 h-4" /> Upload Foto
              <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
            </label>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full rosi-gradient text-primary-foreground py-3 rounded-xl font-bold text-sm disabled:opacity-50">
            {submitting ? "Memproses..." : "Posting ke Market"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Marketplace</h1>
          <p className="text-sm text-muted-foreground">Jual beli sampah bernilai</p>
        </div>
        <button onClick={() => { if (!user) { navigate("/auth"); return; } setShowNewListing(true); }}
          className="w-10 h-10 rosi-gradient rounded-full flex items-center justify-center shadow-md">
          <Plus className="w-5 h-5 text-primary-foreground" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Cari sampah..."
          className="w-full bg-card border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {wasteTypes.map((type) => (
          <button key={type} onClick={() => setActiveFilter(type)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeFilter === type ? "rosi-gradient text-primary-foreground" : "bg-card border border-border text-foreground"
            }`}>{type}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm font-semibold">Belum ada listing</p>
            <p className="text-xs mt-1">Jadilah yang pertama menjual!</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <motion.button key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelectedItem(item)}
                className="bg-card border border-border rounded-xl overflow-hidden text-left">
                {item.image_urls[0] ? (
                  <img src={item.image_urls[0]} alt={item.title} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-muted flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.waste_type} {item.weight_kg ? `• ${item.weight_kg}kg` : ""}</p>
                  <p className="text-sm font-extrabold text-primary mt-1">Rp {item.price.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{item.seller_nickname}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const categories = [
  { id: "plastic", name: "Plastic" },
  { id: "glass", name: "Glass" },
  { id: "paper", name: "Paper" },
  { id: "metal", name: "Metal" },
  { id: "organic", name: "Organic" },
  { id: "ewaste", name: "E-Waste" },
];

export default MarketPage;
