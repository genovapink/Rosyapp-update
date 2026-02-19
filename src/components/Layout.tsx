import { ReactNode } from "react";
import BottomNav from "./BottomNav";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <main className="safe-bottom pb-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
