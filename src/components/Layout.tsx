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

      {/* Peek-a-boo Rosy — static, always present on left edge */}
      <img
        src={rosyPeekaboo}
        alt="Rosy peekaboo"
        className="fixed left-0 bottom-32 w-12 md:w-14 z-40 pointer-events-none select-none drop-shadow-lg"
      />

      <BottomNav />
    </div>
  );
};

export default Layout;
