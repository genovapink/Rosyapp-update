import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Leaf, ArrowRight, Check, Upload, RotateCcw, Share2, Twitter, Shuffle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const categories = [
  { id: "plastic", name: "Plastic", color: "bg-rosi-blue" },
  { id: "glass", name: "Glass", color: "bg-rosi-green" },
  { id: "paper", name: "Paper", color: "bg-rosi-yellow" },
  { id: "metal", name: "Metal", color: "bg-muted-foreground" },
  { id: "organic", name: "Organic", color: "bg-rosi-orange" },
  { id: "ewaste", name: "E-Waste", color: "bg-rosi-purple" },
  { id: "random", name: "Random", color: "bg-foreground" },
];

const steps = ["CATEGORY", "PHOTO", "RESULT"];

interface ScanResult {
  result_name: string;
  is_valuable: boolean;
  description: string;
  recommendation: string;
  impact: string;
}

const ScanWastePage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [savedScanId, setSavedScanId] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCapturedImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const uploadImage = async (base64: string): Promise<string | null> => {
    if (!user) return null;
    try {
      const base64Data = base64.split(",")[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });

      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("waste-images").upload(fileName, blob);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("waste-images").getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (err) {
      console.error("Upload error:", err);
      return null;
    }
  };

  const analyzeWaste = useCallback(async () => {
    if (!user) {
      toast.error("Silakan login terlebih dahulu");
      navigate("/auth");
      return;
    }
    if (!capturedImage || !selectedCategory) return;

    const analysisCategory = selectedCategory === "random"
      ? categories.filter(c => c.id !== "random")[Math.floor(Math.random() * (categories.length - 1))].id
      : selectedCategory;

    setIsAnalyzing(true);
    try {
      const imageUrl = await uploadImage(capturedImage);
      setUploadedImageUrl(imageUrl);

      const { data, error } = await supabase.functions.invoke("analyze-waste", {
        body: { imageBase64: capturedImage, category: analysisCategory },
      });

      if (error) throw error;

      const scanResult: ScanResult = data;
      setResult(scanResult);

      const { data: savedScan, error: saveError } = await supabase
        .from("scan_results")
        .insert({
          user_id: user.id,
          category: analysisCategory,
          image_url: imageUrl,
          result_name: scanResult.result_name,
          is_valuable: scanResult.is_valuable,
          description: scanResult.description,
          recommendation: scanResult.recommendation,
          impact: scanResult.impact,
        } as any)
        .select()
        .single();

      if (saveError) console.error("Save error:", saveError);
      if (savedScan) setSavedScanId((savedScan as any).id);

      await supabase
        .from("profiles")
        .update({
          total_scans: (await supabase.from("scan_results").select("id", { count: "exact" }).eq("user_id", user.id)).count || 0,
        } as any)
        .eq("user_id", user.id);

      await refreshProfile();
      setCurrentStep(2);
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast.error(err.message || "Gagal menganalisa sampah");
    } finally {
      setIsAnalyzing(false);
    }
  }, [capturedImage, selectedCategory, user]);

  const shareToTwitter = () => {
    if (!result) return;
    const text = `🌱 Saya baru saja scan sampah "${result.result_name}" menggunakan Rosy!\n\n${result.is_valuable ? "💰 Sampah ini bernilai ekonomis!" : "♻️ Sampah ini bisa didaur ulang!"}\n\n${result.impact}\n\nCoba scan sampahmu juga di Rosy!\n\nDeveloped by @4anakmasadepan\n#Rosy #RecycleWithRosy`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}${uploadedImageUrl ? `&url=${encodeURIComponent(uploadedImageUrl)}` : ""}`;
    window.open(url, "_blank");
  };

  const listOnMarket = () => {
    if (!savedScanId || !result) return;
    navigate(`/market/new?scan_id=${savedScanId}&name=${encodeURIComponent(result.result_name)}&category=${selectedCategory}&image=${encodeURIComponent(uploadedImageUrl || "")}`);
  };

  const resetScan = () => {
    setCurrentStep(0);
    setSelectedCategory(null);
    setCapturedImage(null);
    setResult(null);
    setSavedScanId(null);
    setUploadedImageUrl(null);
  };

  // Parse recommendation into steps
  const parseSteps = (rec: string) => {
    const lines = rec.split(/\n/).filter(l => l.trim());
    return lines;
  };

  return (
    <div className="px-4 pt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Scan Waste</h1>
        <p className="text-sm text-muted-foreground">Follow the steps to analyze your item.</p>
      </div>

      <div className="flex items-center justify-center gap-6">
        {steps.map((step, i) => (
          <div key={step} className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              i <= currentStep ? "rosi-gradient text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[10px] font-bold ${i <= currentStep ? "text-primary" : "text-muted-foreground"}`}>{step}</span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {currentStep === 0 && (
          <motion.div key="category" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Select Category</h2>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                  className={`bg-card border-2 rounded-xl p-4 flex items-center gap-3 transition-all ${
                    selectedCategory === cat.id ? "border-primary rosi-shadow" : "border-border"
                  }`}>
                  {cat.id === "random" ? (
                    <div className="w-3 h-3 rounded-full bg-foreground" />
                  ) : (
                    <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                  )}
                  <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    {cat.id === "random" && <Shuffle className="w-3.5 h-3.5" />}
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
            <button disabled={!selectedCategory} onClick={() => setCurrentStep(1)}
              className="w-full rosi-gradient text-primary-foreground py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
              <Camera className="w-4 h-4" /> Take Photo
            </button>
          </motion.div>
        )}

        {currentStep === 1 && (
          <motion.div key="photo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
            {capturedImage ? (
              <div className="relative">
                <img src={capturedImage} alt="Captured waste" className="w-full aspect-square object-cover rounded-xl border border-border" />
                <button onClick={() => setCapturedImage(null)} className="absolute top-3 right-3 w-8 h-8 bg-foreground/60 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-background" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square bg-card border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Upload className="w-10 h-10" />
                <span className="text-sm font-semibold">Tap untuk upload foto</span>
              </button>
            )}
            <p className="text-xs text-center text-muted-foreground">
              Selected Category: <span className="font-bold text-primary uppercase">{selectedCategory === "random" ? "🎲 Random" : selectedCategory}</span>
            </p>
            <button disabled={!capturedImage || isAnalyzing} onClick={analyzeWaste}
              className="w-full rosi-gradient text-primary-foreground py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
              {isAnalyzing ? (
                <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Analyzing...</>
              ) : (
                <><Leaf className="w-4 h-4" /> Analyze Waste</>
              )}
            </button>
          </motion.div>
        )}

        {currentStep === 2 && result && (
          <motion.div key="result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {capturedImage && <img src={capturedImage} alt="Scanned" className="w-full h-48 object-cover" />}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">{result.result_name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    result.is_valuable ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {result.is_valuable ? "💰 Bernilai" : "♻️ Daur Ulang"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{result.description}</p>

                {/* Step-by-step recommendation */}
                <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-bold text-secondary-foreground">📋 Cara Mengolah / Kreasi:</p>
                  <div className="space-y-1.5">
                    {parseSteps(result.recommendation).map((step, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{step.replace(/^\d+\.\s*/, '')}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-rosi-green-light rounded-lg p-3">
                  <p className="text-xs text-foreground">{result.impact}</p>
                </div>
              </div>
            </div>

            <button onClick={shareToTwitter}
              className="w-full bg-card border border-border text-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
              <Twitter className="w-4 h-4" /> Share ke Twitter
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={resetScan} className="bg-card border border-border text-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Scan Lagi
              </button>
              <button onClick={listOnMarket} className="rosi-gradient text-primary-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                <ArrowRight className="w-4 h-4" /> Jual di Market
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScanWastePage;
