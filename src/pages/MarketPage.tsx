import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Filter, MapPin, X, Upload, ArrowLeft, Heart, Edit2, Trash2 } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import rosyLeaf from "@/assets/rosy-leaf.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUsageLimits, POINTS_PER_LISTING } from "@/hooks/useUsageLimits";
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
  seller_is_premium?: boolean;
  seller_is_official?: boolean;
}

const wasteTypes = ["Semua", "Plastik", "Kaca", "Kertas", "Logam", "Organik", "Elektronik"];
const wasteTypeMap: Record<string, string> = {
  Plastik: "plastic", Kaca: "glass", Kertas: "paper", Logam: "metal", Organik: "organic", Elektronik: "ewaste",
};

const categories = [
  { id: "plastic", name: "Plastic" },
  { id: "glass", name: "Glass" },
  { id: "paper", name: "Paper" },
  { id: "metal", name: "Metal" },
  { id: "organic", name: "Organic" },
  { id: "ewaste", name: "E-Waste" },
];

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

const MarketPage = () => {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [activeFilter, setActiveFilter] = useState("Semua");
  const [showNewListing, setShowNewListing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null);
  const [editingItem, setEditingItem] = useState<MarketItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { checkListingAllowed, incrementCounter, awardPoints, isPremium } = useUsageLimits();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Form state
  const [title, setTitle] = useState(searchParams.get("name") || "");
  const [description, setDescription] = useState("");
  const [wasteType, setWasteType] = useState(searchParams.get("category") || "plastic");
  const [weightKg, setWeightKg] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const scanImage = searchParams.get("image");
    if (scanImage) setPreviewUrls([scanImage]);
    if (searchParams.get("scan_id")) setShowNewListing(true);
  }, [searchParams]);

  // Fetch favorites
  useEffect(() => {
    if (!user) return;
    const fetchFavs = async () => {
      const { data } = await supabase.from("favorites" as any).select("listing_id").eq("user_id", user.id);
      if (data) setFavorites(new Set((data as any[]).map((f: any) => f.listing_id)));
    };
    fetchFavs();
  }, [user]);

  const toggleFavorite = async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    if (!user) { toast.error("Login dulu"); navigate("/auth"); return; }

    const isFav = favorites.has(listingId);
    if (isFav) {
      await supabase.from("favorites" as any).delete().eq("user_id", user.id).eq("listing_id", listingId);
      setFavorites((prev) => { const n = new Set(prev); n.delete(listingId); return n; });
    } else {
      await supabase.from("favorites" as any).insert({ user_id: user.id, listing_id: listingId } as any);
      setFavorites((prev) => new Set(prev).add(listingId));
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    let query = supabase.from("market_listings" as any).select("*").eq("status", "active").order("created_at", { ascending: false });
    if (activeFilter !== "Semua") {
      const mappedType = wasteTypeMap[activeFilter];
      if (mappedType) query = query.eq("waste_type", mappedType);
    }
    const { data, error } = await query;
    if (error) { console.error(error); setLoading(false); return; }

    const userIds = [...new Set((data as any[]).map((d: any) => d.user_id))];
    let profiles: any[] = [];
    if (userIds.length > 0) {
      const { data: p } = await supabase.from("profiles" as any).select("user_id, nickname, is_premium, is_official").in("user_id", userIds);
      profiles = (p || []) as any[];
    }

    setItems((data as any[]).map((item: any) => {
      const sp = profiles.find((p: any) => p.user_id === item.user_id);
      return {
        ...item,
        image_urls: item.image_urls || [],
        seller_nickname: sp?.nickname || "User",
        seller_is_premium: sp?.is_premium || false,
        seller_is_official: sp?.is_official || false,
      };
    }));
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel("market-realtime-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "market_listings" }, fetchItems)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, fetchItems)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeFilter]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 3);
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Ukuran file maksimal 15 MB per gambar");
        return;
      }
    }
    setImageFiles(files);
    setPreviewUrls(files.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Silakan login terlebih dahulu"); navigate("/auth"); return; }

    // Check monthly listing cap (only for new listings, not edits)
    if (!editingItem) {
      const limitCheck = await checkListingAllowed();
      if (!limitCheck.allowed) {
        toast.error(`Limit listing bulanan tercapai (${limitCheck.used}/${limitCheck.max}). ${isPremium ? "" : "Upgrade ke Premium untuk 10 listing/bulan."}`);
        if (!isPremium) navigate("/premium");
        return;
      }
    }

    setSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      const scanImage = searchParams.get("image");
      if (scanImage) uploadedUrls.push(scanImage);

      for (const file of imageFiles) {
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("waste-images").upload(fileName, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("waste-images").getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }

      if (editingItem) {
        const { error } = await supabase.from("market_listings" as any)
          .update({
            title, description, waste_type: wasteType,
            weight_kg: weightKg ? parseFloat(weightKg) : null,
            price: parseInt(price) || 0, location,
            image_urls: uploadedUrls.length > 0 ? uploadedUrls.slice(0, 3) : editingItem.image_urls,
          } as any)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Listing berhasil diupdate!");
      } else {
        const { error } = await supabase.from("market_listings" as any).insert({
          user_id: user.id, title, description, waste_type: wasteType,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          price: parseInt(price) || 0, location,
          image_urls: uploadedUrls.slice(0, 3),
          scan_result_id: searchParams.get("scan_id") || null,
        } as any);
        if (error) throw error;
        await Promise.all([
          incrementCounter("listings_count"),
          awardPoints(POINTS_PER_LISTING),
        ]);
        toast.success(`Listing dibuat! +${POINTS_PER_LISTING} Rosy Points 🎉`);
      }

      setShowNewListing(false);
      setEditingItem(null);
      resetForm();
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan listing");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setWeightKg(""); setPrice(""); setLocation("");
    setImageFiles([]); setPreviewUrls([]);
  };

  const handleEdit = (item: MarketItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || "");
    setWasteType(item.waste_type);
    setWeightKg(item.weight_kg?.toString() || "");
    setPrice(item.price.toString());
    setLocation(item.location || "");
    setPreviewUrls(item.image_urls);
    setShowNewListing(true);
    setSelectedItem(null);
  };

  const handleDelete = async (item: MarketItem) => {
    if (!confirm("Hapus listing ini?")) return;
    const { error } = await supabase.from("market_listings" as any).delete().eq("id", item.id);
    if (error) { toast.error("Gagal menghapus"); return; }
    toast.success("Listing dihapus");
    setSelectedItem(null);
    fetchItems();
  };

  const startChat = async (item: MarketItem) => {
    if (!user) { toast.error("Login dulu"); navigate("/auth"); return; }
    if (item.user_id === user.id) { toast.info("Ini listing kamu sendiri"); return; }
    const { data: existing } = await supabase.from("conversations" as any).select("*")
      .eq("listing_id", item.id).eq("buyer_id", user.id).eq("seller_id", item.user_id).maybeSingle();

    let conversationId: string;
    if (existing) {
      conversationId = (existing as any).id;
    } else {
      const { data: newConv, error } = await supabase.from("conversations" as any).insert({
        listing_id: item.id, buyer_id: user.id, seller_id: item.user_id,
      } as any).select().single();
      if (error) { toast.error("Gagal memulai chat"); return; }
      conversationId = (newConv as any).id;
    }
    navigate(`/chat?conversation=${conversationId}`);
  };

  // Detail view
  if (selectedItem) {
    const isOwner = user?.id === selectedItem.user_id;
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
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold text-foreground">{selectedItem.title}</h1>
            <button onClick={(e) => toggleFavorite(e, selectedItem.id)}>
              <Heart className={`w-6 h-6 ${favorites.has(selectedItem.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
            </button>
          </div>
          <p className="text-2xl font-extrabold text-primary">Rp {selectedItem.price.toLocaleString()}</p>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-bold">{selectedItem.waste_type}</span>
            {selectedItem.weight_kg && <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-bold">{selectedItem.weight_kg} kg</span>}
          </div>
          {selectedItem.location && <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedItem.location}</p>}
          {selectedItem.description && <p className="text-sm text-foreground">{selectedItem.description}</p>}
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Dijual oleh: <span className="font-semibold text-foreground">{selectedItem.seller_nickname}</span>
            {selectedItem.seller_is_official && <VerifiedBadge variant="official" className="w-3.5 h-3.5" />}
            {!selectedItem.seller_is_official && selectedItem.seller_is_premium && <VerifiedBadge variant="premium" className="w-3.5 h-3.5" />}
          </p>

          {isOwner ? (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleEdit(selectedItem)}
                className="bg-card border border-border text-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button onClick={() => handleDelete(selectedItem)}
                className="bg-destructive text-destructive-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Hapus
              </button>
            </div>
          ) : (
            <button onClick={() => startChat(selectedItem)}
              className="w-full rosi-gradient text-primary-foreground py-3 rounded-xl font-bold text-sm">
              💬 Chat Penjual
            </button>
          )}
        </div>
      </div>
    );
  }

  // New/Edit listing form
  if (showNewListing) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-foreground">{editingItem ? "Edit Listing" : "Jual Sampah"}</h1>
          <button onClick={() => { setShowNewListing(false); setEditingItem(null); resetForm(); }}><X className="w-5 h-5 text-muted-foreground" /></button>
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
          
          <div>
            <p className="text-xs text-muted-foreground mb-2">Foto (maks 3, maks 15 MB/foto)</p>
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
            {submitting ? "Memproses..." : editingItem ? "Simpan Perubahan" : "Posting ke Market"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Marketplace</h1>
            <p className="text-sm text-muted-foreground">Jual beli sampah bernilai</p>
          </div>
          <img src={rosyLeaf} alt="Rosy leaf" className="w-12 h-12 object-contain drop-shadow-sm" />
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
                className="bg-card border border-border rounded-xl overflow-hidden text-left relative">
                {item.image_urls[0] ? (
                  <img src={item.image_urls[0]} alt={item.title} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-muted flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                <button
                  onClick={(e) => toggleFavorite(e, item.id)}
                  className="absolute top-2 right-2 w-8 h-8 bg-card/80 backdrop-blur-sm rounded-full flex items-center justify-center"
                >
                  <Heart className={`w-4 h-4 ${favorites.has(item.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                </button>
                <div className="p-3">
                  <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.waste_type} {item.weight_kg ? `• ${item.weight_kg}kg` : ""}</p>
                  <p className="text-sm font-extrabold text-primary mt-1">Rp {item.price.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-0.5">
                    {item.seller_nickname}
                    {item.seller_is_official && <VerifiedBadge variant="official" className="w-3 h-3" />}
                    {!item.seller_is_official && item.seller_is_premium && <VerifiedBadge variant="premium" className="w-3 h-3" />}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketPage;
