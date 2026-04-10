import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, MessageCircle, ArrowLeft, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";

const ROSY_OFFICIAL_ID = "352cfaa2-1cbb-4abd-90e3-9e7f349d9cfd";

interface Conversation {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  updated_at: string;
  other_nickname?: string;
  last_message?: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const quickQuestions = [
  "Ini masih ada?",
  "Bisa info lebih detail?",
  "Cara transaksinya bagaimana?",
];

const ChatPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const convId = searchParams.get("conversation");
    if (convId) setActiveConversation(convId);
  }, [searchParams]);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("conversations" as any)
        .select("*")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (data) {
        const convs = data as any[];
        const otherIds = convs.map((c: any) => c.buyer_id === user.id ? c.seller_id : c.buyer_id);
        const { data: profiles } = await supabase.from("profiles" as any).select("user_id, nickname").in("user_id", otherIds);

        const enriched = convs.map((c: any) => ({
          ...c,
          other_nickname: (profiles as any[] || []).find((p: any) => p.user_id === (c.buyer_id === user.id ? c.seller_id : c.buyer_id))?.nickname || "User",
        }));
        setConversations(enriched);
      }
      setLoading(false);
    };
    fetchConversations();
  }, [user]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConversation) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages" as any)
        .select("*")
        .eq("conversation_id", activeConversation)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as any[]);
    };
    fetchMessages();

    // Subscribe to realtime
    const channel = supabase
      .channel(`messages-${activeConversation}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConversation}`,
      }, (payload: any) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !activeConversation) return;
    const content = input.trim();
    setInput("");

    await supabase.from("messages" as any).insert({
      conversation_id: activeConversation,
      sender_id: user.id,
      content,
    } as any);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] px-4">
        <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-sm font-semibold text-foreground mb-2">Login untuk mulai chat</p>
        <button onClick={() => navigate("/auth")} className="rosi-gradient text-primary-foreground px-6 py-2 rounded-full text-sm font-bold">
          Login
        </button>
      </div>
    );
  }

  // Active chat view
  if (activeConversation) {
    const conv = conversations.find((c) => c.id === activeConversation);
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-3">
          <button onClick={() => setActiveConversation(null)}>
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-1">
            <p className="font-bold text-foreground text-sm">{conv?.other_nickname || "Chat"}</p>
            {conv && (conv.seller_id === ROSY_OFFICIAL_ID || conv.buyer_id === ROSY_OFFICIAL_ID) && (
              <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500" />
            )}
          </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.sender_id === user.id ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.sender_id === user.id
                  ? "rosi-gradient text-primary-foreground rounded-br-sm"
                  : "bg-card border border-border text-foreground rounded-bl-sm"
              }`}>
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.sender_id === user.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 0 && (
          <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
            {quickQuestions.map((q) => (
              <button key={q} onClick={() => setInput(q)}
                className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-xs font-semibold whitespace-nowrap">
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 py-3 border-t border-border">
          <div className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ketik pesan..."
              className="flex-1 bg-card border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={sendMessage} disabled={!input.trim()}
              className="w-10 h-10 rosi-gradient rounded-full flex items-center justify-center disabled:opacity-40">
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Conversation list
  return (
    <div className="px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-extrabold text-foreground">Chat</h1>
      <p className="text-sm text-muted-foreground">Komunikasi dengan penjual & pembeli</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <MessageCircle className="w-8 h-8 opacity-50" />
          </div>
          <p className="text-sm font-semibold">Belum ada pesan</p>
          <p className="text-xs mt-1">Mulai chat dari listing di Market</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <button key={conv.id} onClick={() => setActiveConversation(conv.id)}
              className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-xl text-left">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-sm font-bold text-secondary-foreground">
                  {(conv.other_nickname || "U")[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-bold text-foreground">{conv.other_nickname}</p>
                  {(conv.seller_id === ROSY_OFFICIAL_ID || conv.buyer_id === ROSY_OFFICIAL_ID) && (
                    <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {new Date(conv.updated_at).toLocaleDateString("id-ID")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatPage;
