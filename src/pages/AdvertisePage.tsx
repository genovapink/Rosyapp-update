import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle, Upload, ExternalLink, CheckCircle, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WHATSAPP_NUMBER = "6288242150920";
const USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const RECEIVER_WALLET = "0x0E3fCDD57e0B52a42E83D1B7bc5D75f782076057";

const AdvertisePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<"whatsapp" | "base" | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 15 MB");
      return;
    }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;
    const fileName = `promotions/${user.id}/${Date.now()}-${imageFile.name}`;
    const { error } = await supabase.storage.from("waste-images").upload(fileName, imageFile);
    if (error) throw error;
    const { data } = supabase.storage.from("waste-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const connectWallet = async () => {
    if (!(window as any).ethereum) {
      toast.error("Install MetaMask terlebih dahulu");
      return;
    }
    try {
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      setWalletAddress(accounts[0]);
      setWalletConnected(true);

      // Switch to Base network
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x2105" }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x2105",
              chainName: "Base",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://mainnet.base.org"],
              blockExplorerUrls: ["https://basescan.org"],
            }],
          });
        }
      }
      toast.success("Wallet terhubung!");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghubungkan wallet");
    }
  };

  const handleWhatsAppSubmit = async () => {
    if (!user) { toast.error("Login dulu"); navigate("/auth"); return; }
    if (!title) { toast.error("Masukkan nama produk/toko"); return; }
    setSubmitting(true);
    try {
      const imageUrl = await uploadImage();
      await supabase.from("promotions").insert({
        user_id: user.id,
        title,
        description,
        image_url: imageUrl,
        payment_method: "whatsapp",
        status: "pending",
      } as any);

      const waText = encodeURIComponent(
        `Halo, saya ingin memasang iklan di Rosy!\n\nNama Produk: ${title}\nDeskripsi: ${description || "-"}\n\nMohon konfirmasi pembayaran. Terima kasih!`
      );
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`, "_blank");
      setSuccess(true);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBaseSubmit = async () => {
    if (!user) { toast.error("Login dulu"); navigate("/auth"); return; }
    if (!title) { toast.error("Masukkan nama produk/toko"); return; }
    if (!walletConnected || !walletAddress) { toast.error("Hubungkan wallet dulu"); return; }

    setSubmitting(true);
    try {
      const imageUrl = await uploadImage();
      const ethereum = (window as any).ethereum;

      // USDC transfer: $1 = 1000000 (6 decimals)
      const amount = (1000000).toString(16);
      const transferData = "0xa9059cbb" +
        RECEIVER_WALLET.slice(2).padStart(64, "0") +
        BigInt("0x" + amount).toString(16).padStart(64, "0");

      const txHash = await ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: walletAddress,
          to: USDC_CONTRACT,
          data: transferData,
        }],
      });

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      await supabase.from("promotions").insert({
        user_id: user.id,
        title,
        description,
        image_url: imageUrl,
        payment_method: "base",
        wallet_address: walletAddress,
        tx_hash: txHash,
        status: "active",
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      } as any);

      setSuccess(true);
      toast.success("Iklan berhasil dipublish selama 30 hari!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Transaksi gagal");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="px-4 pt-6 space-y-6 flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-4 text-center">
          <CheckCircle className="w-16 h-16 text-primary" />
          <h1 className="text-xl font-extrabold text-foreground">Iklan Berhasil Dikirim!</h1>
          <p className="text-sm text-muted-foreground">
            {paymentMethod === "whatsapp"
              ? "Tim kami akan mengkonfirmasi pembayaran via WhatsApp."
              : "Iklan kamu aktif selama 30 hari."}
          </p>
          <button onClick={() => navigate("/")} className="rosi-gradient text-primary-foreground px-6 py-3 rounded-xl font-bold text-sm">
            Kembali ke Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-5">
      <button onClick={() => navigate("/profile")} className="flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      <div>
        <h1 className="text-xl font-extrabold text-foreground">Advertise with Us</h1>
        <p className="text-sm text-muted-foreground">Promosikan produk/toko kamu di Rosy</p>
      </div>

      {/* Payment method selection */}
      <div className="space-y-3">
        <p className="text-sm font-bold text-foreground">Pilih Metode Pembayaran:</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPaymentMethod("whatsapp")}
            className={`border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${
              paymentMethod === "whatsapp" ? "border-primary rosi-shadow" : "border-border bg-card"
            }`}
          >
            <MessageCircle className="w-8 h-8 text-primary" />
            <span className="text-xs font-bold text-foreground">WhatsApp</span>
            <span className="text-[10px] text-muted-foreground">Manual</span>
          </button>
          <button
            onClick={() => setPaymentMethod("base")}
            className={`border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${
              paymentMethod === "base" ? "border-primary rosi-shadow" : "border-border bg-card"
            }`}
          >
            <div className="w-8 h-8 rounded bg-[#0052FF] flex items-center justify-center">
              <span className="text-[10px] font-extrabold text-white">B</span>
            </div>
            <span className="text-xs font-bold text-foreground flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-[#0052FF] inline-block" />
              <span className="font-extrabold text-foreground">Base</span> USDC
            </span>
            <span className="text-[10px] text-muted-foreground">Crypto</span>
          </button>
        </div>
      </div>

      {paymentMethod && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {/* Wallet connect for Base */}
          {paymentMethod === "base" && (
            <div className="space-y-2">
              {walletConnected ? (
                <div className="bg-secondary rounded-xl px-4 py-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="text-xs text-foreground font-semibold truncate">{walletAddress}</span>
                  <CheckCircle className="w-4 h-4 text-primary ml-auto flex-shrink-0" />
                </div>
              ) : (
                <button onClick={connectWallet}
                  className="w-full bg-[#0052FF] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  <Wallet className="w-4 h-4" /> Connect MetaMask Wallet
                </button>
              )}
            </div>
          )}

          <p className="text-sm font-bold text-foreground">Detail Iklan:</p>
          
          {previewUrl && (
            <img src={previewUrl} alt="" className="w-full h-40 object-cover rounded-xl border border-border" />
          )}
          <label className="flex items-center gap-2 text-sm text-primary font-semibold cursor-pointer">
            <Upload className="w-4 h-4" /> Upload Gambar Produk/Toko
            <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          </label>

          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nama Produk/Toko" required
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi singkat (opsional)" rows={2}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />

          <div className="bg-card border border-border rounded-xl p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-bold text-foreground">💡 Info Harga:</p>
            <p>• Durasi: 30 hari</p>
            <p>• Harga: {paymentMethod === "base" ? "$1 USDC" : "Rp 25.000"}</p>
            {paymentMethod === "base" && <p>• Network: Base (Ethereum L2)</p>}
          </div>

          <button
            onClick={paymentMethod === "whatsapp" ? handleWhatsAppSubmit : handleBaseSubmit}
            disabled={submitting || !title || (paymentMethod === "base" && !walletConnected)}
            className="w-full rosi-gradient text-primary-foreground py-3 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Memproses...</>
            ) : paymentMethod === "whatsapp" ? (
              <><MessageCircle className="w-4 h-4" /> Hubungi via WhatsApp</>
            ) : (
              <><ExternalLink className="w-4 h-4" /> Bayar $1 USDC di Base</>
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default AdvertisePage;
