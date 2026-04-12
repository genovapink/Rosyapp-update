import { useState } from "react";
import { Menu, Globe, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";

const LanguageMenu = () => {
  const [open, setOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const languages = [
    { code: "id" as const, label: "🇮🇩 Bahasa Indonesia" },
    { code: "en" as const, label: "🇬🇧 English" },
    { code: "zh" as const, label: "🇨🇳 中文 (Mandarin)" },
  ];

  return (
    <>
      <button onClick={() => setOpen(true)} className="p-2 rounded-lg hover:bg-muted transition-colors">
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/40 z-50" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-72 bg-card border-l border-border z-50 p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" /> {t("lang.title")}
                </h3>
                <button onClick={() => setOpen(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      language === lang.code
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground hover:bg-muted/80"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default LanguageMenu;
