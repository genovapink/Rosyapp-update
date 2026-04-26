import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Linkedin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import certificateRosy from "@/assets/sertifikat-rosy.png";
import baseLogo from "@/assets/base-logo-blue.png";

const courseHighlights = [
  "Finish a course to unlock minting",
  "Mint on-chain on Base",
  "Pay gas with USDC",
  "One-tap share to LinkedIn",
];

const RosyCoursePage = () => {
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-6 pb-24 space-y-5 min-h-[70vh] relative overflow-hidden">
      <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl bg-card border border-border p-5 overflow-hidden space-y-5"
      >
        <div className="absolute right-4 top-4 rounded-full bg-primary/10 text-primary px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide">
          On Chain
        </div>
        <motion.img
          src={certificateRosy}
          alt="ROSY achievement certificate preview"
          animate={{ y: [0, -8, 0], rotate: [-1, 1, -1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-full max-w-xs mx-auto object-contain drop-shadow-lg"
        />
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-extrabold text-rosi-yellow">COMING SOON!</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Complete ROSY courses to mint an official achievement certificate on the Base blockchain. Share it on LinkedIn and prove your impact.
          </p>
        </div>
        <div className="space-y-2">
          {courseHighlights.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="flex items-end justify-between pt-2 gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
            <span>Powered by</span>
            <img src={baseLogo} alt="Base" className="w-6 h-6 rounded-full object-contain" />
            <span className="font-extrabold text-foreground">Base</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-rosi-blue flex items-center justify-center text-primary-foreground flex-shrink-0" aria-label="LinkedIn">
            <Linkedin className="w-5 h-5" />
          </div>
        </div>
      </motion.div>

      <p className="text-center text-xs text-muted-foreground px-4">
        Course, minting, dan sertifikat resmi akan tersedia setelah fitur ROSY Course dibuka.
      </p>
    </div>
  );
};

export default RosyCoursePage;