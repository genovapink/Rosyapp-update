import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Leaf, ArrowRight, Check, Upload, RotateCcw } from "lucide-react";

const categories = [
  { id: "plastic", name: "Plastic", color: "bg-rosi-blue" },
  { id: "glass", name: "Glass", color: "bg-rosi-green" },
  { id: "paper", name: "Paper", color: "bg-rosi-yellow" },
  { id: "metal", name: "Metal", color: "bg-muted-foreground" },
  { id: "organic", name: "Organic", color: "bg-rosi-orange" },
  { id: "ewaste", name: "E-Waste", color: "bg-rosi-purple" },
];

const steps = ["CATEGORY", "PHOTO", "RESULT"];

const ScanWastePage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const analyzeWaste = useCallback(async () => {
    setIsAnalyzing(true);
    // Simulate AI analysis - will be replaced with TensorFlow.js
    await new Promise((r) => setTimeout(r, 2000));
    
    const cat = categories.find(c => c.id === selectedCategory);
    setResult({
      name: `${cat?.name || "Unknown"} Waste`,
      category: cat?.name || "Unknown",
      valuable: Math.random() > 0.3,
      description: "Sampah ini terdeteksi dan dapat diproses lebih lanjut.",
      recommendation: "Bersihkan, pisahkan berdasarkan jenis, dan jual melalui Market ROSi atau serahkan ke bank sampah terdekat.",
      impact: "Dengan mendaur ulang sampah ini, kamu membantu mengurangi penumpukan di TPA dan melestarikan lingkungan! 🌍",
    });
    setIsAnalyzing(false);
    setCurrentStep(2);
  }, [selectedCategory]);

  const resetScan = () => {
    setCurrentStep(0);
    setSelectedCategory(null);
    setCapturedImage(null);
    setResult(null);
  };

  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Scan Waste</h1>
        <p className="text-sm text-muted-foreground">Follow the steps to analyze your item.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-6">
        {steps.map((step, i) => (
          <div key={step} className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                i <= currentStep
                  ? "rosi-gradient text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[10px] font-bold ${i <= currentStep ? "text-primary" : "text-muted-foreground"}`}>
              {step}
            </span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Category */}
        {currentStep === 0 && (
          <motion.div
            key="category"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-bold text-foreground">Select Category</h2>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`bg-card border-2 rounded-xl p-4 flex items-center gap-3 transition-all ${
                    selectedCategory === cat.id
                      ? "border-primary rosi-shadow"
                      : "border-border"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                  <span className="text-sm font-semibold text-foreground">{cat.name}</span>
                </button>
              ))}
            </div>

            <button
              disabled={!selectedCategory}
              onClick={() => setCurrentStep(1)}
              className="w-full rosi-gradient text-primary-foreground py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
            >
              <Camera className="w-4 h-4" /> Take Photo
            </button>
          </motion.div>
        )}

        {/* Step 2: Photo */}
        {currentStep === 1 && (
          <motion.div
            key="photo"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />

            {capturedImage ? (
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured waste"
                  className="w-full aspect-square object-cover rounded-xl border border-border"
                />
                <button
                  onClick={() => setCapturedImage(null)}
                  className="absolute top-3 right-3 w-8 h-8 bg-foreground/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-background" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square bg-card border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 text-muted-foreground"
              >
                <Upload className="w-10 h-10" />
                <span className="text-sm font-semibold">Tap untuk upload foto</span>
              </button>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Selected Category: <span className="font-bold text-primary uppercase">{selectedCategory}</span>
            </p>

            <button
              disabled={!capturedImage || isAnalyzing}
              onClick={analyzeWaste}
              className="w-full rosi-gradient text-primary-foreground py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Leaf className="w-4 h-4" /> Analyze Waste
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Step 3: Result */}
        {currentStep === 2 && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Result Card */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {capturedImage && (
                <img src={capturedImage} alt="Scanned" className="w-full h-48 object-cover" />
              )}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">{result.name}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      result.valuable
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {result.valuable ? "💰 Bernilai" : "♻️ Daur Ulang"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{result.description}</p>
                
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs font-bold text-secondary-foreground mb-1">Rekomendasi:</p>
                  <p className="text-xs text-muted-foreground">{result.recommendation}</p>
                </div>

                <div className="bg-rosi-green-light rounded-lg p-3">
                  <p className="text-xs text-foreground">{result.impact}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={resetScan}
                className="bg-card border border-border text-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Scan Lagi
              </button>
              <button className="rosi-gradient text-primary-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
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
