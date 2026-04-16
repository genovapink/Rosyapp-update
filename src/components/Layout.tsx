import { ReactNode } from "react";
import { motion } from "framer-motion";
import BottomNav from "./BottomNav";
import rosyPeekaboo from "@/assets/rosy-peekaboo.png";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <main className="safe-bottom pb-4">
        {children}
      </main>

      {/* Peek-a-boo Rosy — always present on left edge */}
      <motion.img
        src={rosyPeekaboo}
        alt="Rosy peekaboo"
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: [-40, 0, 0, -30, 0], opacity: 1 }}
        transition={{
          duration: 4,
          times: [0, 0.2, 0.6, 0.8, 1],
          repeat: Infinity,
          repeatDelay: 3,
          ease: "easeInOut",
        }}
        className="fixed left-0 bottom-32 w-16 md:w-20 z-40 pointer-events-none select-none drop-shadow-lg"
      />

      <BottomNav />
    </div>
  );
};

export default Layout;
