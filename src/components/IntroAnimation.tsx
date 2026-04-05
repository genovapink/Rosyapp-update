import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import rosiLogo from "@/assets/rosi-logo.png";

interface IntroAnimationProps {
  onComplete: () => void;
}

const IntroAnimation = ({ onComplete }: IntroAnimationProps) => {
  const [phase, setPhase] = useState<"fadeIn" | "spin" | "text" | "exit">("fadeIn");

  const rosiText = "Rosy";
  const scanText = "Scan";

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {phase !== "exit" && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[9999] bg-background flex items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4">
            {/* Logo phases */}
            {phase === "fadeIn" && (
              <motion.img
                src={rosiLogo}
                alt="ROSi"
                className="w-20 h-20"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                onAnimationComplete={() => setPhase("spin")}
              />
            )}

            {phase === "spin" && (
              <motion.img
                src={rosiLogo}
                alt="ROSi"
                className="w-20 h-20"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                onAnimationComplete={() => setPhase("text")}
              />
            )}

            {phase === "text" && (
              <motion.img
                src={rosiLogo}
                alt="ROSi"
                className="w-20 h-20"
              />
            )}

            {/* Typing text */}
            {phase === "text" && (
              <motion.div
                className="flex flex-col leading-tight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex overflow-hidden">
                  {rosiText.split("").map((char, i) => (
                    <motion.span
                      key={`r-${i}`}
                      className="text-3xl font-extrabold text-foreground"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.15 }}
                    >
                      {char}
                    </motion.span>
                  ))}
                </div>
                <div className="flex overflow-hidden">
                  {scanText.split("").map((char, i) => (
                    <motion.span
                      key={`s-${i}`}
                      className="text-xl font-bold text-primary"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: rosiText.length * 0.08 + i * 0.08,
                        duration: 0.15,
                      }}
                      onAnimationComplete={() => {
                        if (i === scanText.length - 1) {
                          setTimeout(() => setPhase("exit"), 600);
                        }
                      }}
                    >
                      {char}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroAnimation;
