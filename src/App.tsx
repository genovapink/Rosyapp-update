import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import MarketPage from "./pages/MarketPage";
import ScanWastePage from "./pages/ScanWastePage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<Layout><Index /></Layout>} />
            <Route path="/market" element={<Layout><MarketPage /></Layout>} />
            <Route path="/market/new" element={<Layout><MarketPage /></Layout>} />
            <Route path="/scan" element={<Layout><ScanWastePage /></Layout>} />
            <Route path="/chat" element={<Layout><ChatPage /></Layout>} />
            <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
