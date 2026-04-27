import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import rosiLogo from "@/assets/rosi-logo.png";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type Mode = "login" | "signup" | "verify-signup" | "forgot" | "verify-reset" | "new-password";
type SendStatus = "idle" | "sending" | "sent" | "failed";

const AuthPage = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [sendError, setSendError] = useState<string>("");
  const navigate = useNavigate();

  const resetState = () => {
    setOtp("");
    setPassword("");
    setNewPassword("");
    setSendStatus("idle");
    setSendError("");
  };

  // LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Berhasil masuk!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Gagal masuk");
    } finally {
      setLoading(false);
    }
  };

  // SIGNUP — kirim OTP 6 digit via signInWithOtp (shouldCreateUser=true)
  // Password disimpan sementara dan di-set setelah verifikasi berhasil.
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSendStatus("sending");
    setSendError("");
    try {
      // Simpan password & nickname sementara di sessionStorage untuk dipakai
      // setelah OTP terverifikasi (lalu user login).
      sessionStorage.setItem("rosy_pending_password", password);
      sessionStorage.setItem("rosy_pending_nickname", nickname);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: { nickname },
        },
      });
      if (error) throw error;
      setSendStatus("sent");
      toast.success("Kode 6 digit terkirim ke email kamu!");
      setMode("verify-signup");
    } catch (error: any) {
      setSendStatus("failed");
      setSendError(error.message || "Gagal mengirim kode");
      toast.error(error.message || "Gagal mengirim kode");
    } finally {
      setLoading(false);
    }
  };

  // VERIFY SIGNUP OTP — verify lalu set password user
  const handleVerifySignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendStatus !== "sent") {
      toast.error("Kode belum terkirim. Coba kirim ulang dulu.");
      return;
    }
    if (otp.length !== 6) { toast.error("Masukkan 6 digit kode"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email, token: otp, type: "email",
      });
      if (error) throw error;

      // Set password setelah berhasil verifikasi & login
      const pendingPwd = sessionStorage.getItem("rosy_pending_password");
      if (pendingPwd) {
        const { error: pwdErr } = await supabase.auth.updateUser({ password: pendingPwd });
        if (pwdErr) console.warn("Password set error:", pwdErr);
        sessionStorage.removeItem("rosy_pending_password");
        sessionStorage.removeItem("rosy_pending_nickname");
      }

      toast.success("Email terverifikasi! Selamat datang 🎉");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Kode salah / kedaluwarsa");
    } finally {
      setLoading(false);
    }
  };

  // FORGOT — kirim OTP recovery via signInWithOtp (user sudah ada)
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Masukkan email"); return; }
    setLoading(true);
    setSendStatus("sending");
    setSendError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setSendStatus("sent");
      toast.success("Kode 6 digit terkirim ke email kamu!");
      setMode("verify-reset");
    } catch (error: any) {
      setSendStatus("failed");
      setSendError(error.message || "Email tidak ditemukan / gagal kirim");
      toast.error(error.message || "Gagal kirim kode");
    } finally {
      setLoading(false);
    }
  };

  // VERIFY RESET OTP — login pakai OTP, lalu user bisa update password
  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendStatus !== "sent") {
      toast.error("Kode belum terkirim. Coba kirim ulang dulu.");
      return;
    }
    if (otp.length !== 6) { toast.error("Masukkan 6 digit kode"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email, token: otp, type: "email",
      });
      if (error) throw error;
      toast.success("Kode benar! Buat password baru.");
      setMode("new-password");
    } catch (error: any) {
      toast.error(error.message || "Kode salah / kedaluwarsa");
    } finally {
      setLoading(false);
    }
  };

  // SET NEW PASSWORD
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error("Password minimal 6 karakter"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password berhasil diubah!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Gagal ubah password");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (purpose: "signup" | "reset") => {
    setLoading(true);
    setSendStatus("sending");
    setSendError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: purpose === "signup" },
      });
      if (error) throw error;
      setSendStatus("sent");
      toast.success("Kode baru terkirim");
    } catch (e: any) {
      setSendStatus("failed");
      setSendError(e.message || "Gagal kirim ulang");
      toast.error(e.message || "Gagal kirim ulang");
    } finally {
      setLoading(false);
    }
  };

  const StatusBanner = () => {
    if (sendStatus === "idle") return null;
    if (sendStatus === "sending") {
      return (
        <div className="flex items-center gap-2 bg-secondary text-foreground rounded-xl px-3 py-2 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Mengirim kode ke {email}...</span>
        </div>
      );
    }
    if (sendStatus === "sent") {
      return (
        <div className="flex items-center gap-2 bg-primary/10 text-foreground rounded-xl px-3 py-2 text-xs border border-primary/30">
          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
          <span>Kode terkirim! Cek inbox / spam Gmail kamu.</span>
        </div>
      );
    }
    return (
      <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-xl px-3 py-2 text-xs border border-destructive/30">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{sendError || "Gagal kirim kode"}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <img src={rosiLogo} alt="Rosy Logo" className="w-20 h-20 mx-auto" />
          <h1 className="text-3xl font-extrabold text-foreground">Rosy</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" && "Masuk ke akun kamu"}
            {mode === "signup" && "Buat akun baru"}
            {mode === "verify-signup" && "Verifikasi email kamu"}
            {mode === "forgot" && "Lupa password?"}
            {mode === "verify-reset" && "Masukkan kode dari email"}
            {mode === "new-password" && "Buat password baru"}
          </p>
        </div>

        {/* LOGIN */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full bg-card border border-border rounded-xl pl-10 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            <button type="submit" disabled={loading}
              className="w-full rosi-gradient text-primary-foreground py-3 rounded-xl font-bold text-sm disabled:opacity-50">
              {loading ? "Loading..." : "Masuk"}
            </button>
            <button type="button" onClick={() => { resetState(); setMode("forgot"); }}
              className="w-full text-sm text-primary font-semibold">
              Lupa Password?
            </button>
            <p className="text-center text-sm text-muted-foreground">
              Belum punya akun?{" "}
              <button type="button" onClick={() => { resetState(); setMode("signup"); }} className="text-primary font-bold">Daftar</button>
            </p>
          </form>
        )}

        {/* SIGNUP */}
        {mode === "signup" && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} required
                className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type={showPassword ? "text" : "password"} placeholder="Password (min 6 karakter)" value={password}
                onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full bg-card border border-border rounded-xl pl-10 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            <button type="submit" disabled={loading}
              className="w-full rosi-gradient text-primary-foreground py-3 rounded-xl font-bold text-sm disabled:opacity-50">
              {loading ? "Mengirim kode..." : "Daftar & Kirim Kode"}
            </button>
            <p className="text-center text-sm text-muted-foreground">
              Sudah punya akun?{" "}
              <button type="button" onClick={() => { resetState(); setMode("login"); }} className="text-primary font-bold">Masuk</button>
            </p>
          </form>
        )}

        {/* VERIFY SIGNUP */}
        {mode === "verify-signup" && (
          <form onSubmit={handleVerifySignup} className="space-y-5">
            <div className="bg-card border border-border rounded-xl p-4 text-center space-y-1">
              <KeyRound className="w-6 h-6 text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">Kode 6 digit dikirim ke</p>
              <p className="text-sm font-bold text-foreground break-all">{email}</p>
            </div>
            <StatusBanner />
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={sendStatus !== "sent"}>
                <InputOTPGroup>
                  {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} className="w-11 h-12 text-base" />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <button type="submit" disabled={loading || otp.length !== 6 || sendStatus !== "sent"}
              className="w-full rosi-gradient text-primary-foreground py-3 rounded-xl font-bold text-sm disabled:opacity-50">
              {loading ? "Memverifikasi..." : "Verifikasi"}
            </button>
            <button type="button" onClick={() => handleResend("signup")} disabled={loading}
              className="w-full text-sm text-primary font-semibold disabled:opacity-50">
              Kirim ulang kode
            </button>
            <button type="button" onClick={() => { resetState(); setMode("login"); }}
              className="w-full text-sm text-muted-foreground flex items-center justify-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Kembali
            </button>
          </form>
        )}

        {/* FORGOT */}
        {mode === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="email" placeholder="Email kamu" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full rosi-gradient text-primary-foreground py-3 rounded-xl font-bold text-sm disabled:opacity-50">
              {loading ? "Mengirim..." : "Kirim Kode 6 Digit"}
            </button>
            <button type="button" onClick={() => { resetState(); setMode("login"); }}
              className="w-full text-sm text-muted-foreground flex items-center justify-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Kembali ke Login
            </button>
          </form>
        )}

        {/* VERIFY RESET */}
        {mode === "verify-reset" && (
          <form onSubmit={handleVerifyReset} className="space-y-5">
            <div className="bg-card border border-border rounded-xl p-4 text-center space-y-1">
              <KeyRound className="w-6 h-6 text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">Kode reset password dikirim ke</p>
              <p className="text-sm font-bold text-foreground break-all">{email}</p>
            </div>
            <StatusBanner />
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={sendStatus !== "sent"}>
                <InputOTPGroup>
                  {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} className="w-11 h-12 text-base" />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <button type="submit" disabled={loading || otp.length !== 6 || sendStatus !== "sent"}
              className="w-full rosi-gradient text-primary-foreground py-3 rounded-xl font-bold text-sm disabled:opacity-50">
              {loading ? "Memverifikasi..." : "Verifikasi Kode"}
            </button>
            <button type="button" onClick={() => handleResend("reset")} disabled={loading}
              className="w-full text-sm text-primary font-semibold disabled:opacity-50">
              Kirim ulang kode
            </button>
            <button type="button" onClick={() => { resetState(); setMode("forgot"); }}
              className="w-full text-sm text-muted-foreground flex items-center justify-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Kembali
            </button>
          </form>
        )}

        {/* NEW PASSWORD */}
        {mode === "new-password" && (
          <form onSubmit={handleSetNewPassword} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type={showPassword ? "text" : "password"} placeholder="Password baru" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} required minLength={6}
                className="w-full bg-card border border-border rounded-xl pl-10 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            <button type="submit" disabled={loading}
              className="w-full rosi-gradient text-primary-foreground py-3 rounded-xl font-bold text-sm disabled:opacity-50">
              {loading ? "Menyimpan..." : "Simpan Password Baru"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default AuthPage;
