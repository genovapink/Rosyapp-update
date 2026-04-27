import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, MessageCircle, ArrowLeft, BadgeCheck, QrCode, ScanLine, Users, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const ROSY_OFFICIAL_ID = "352cfaa2-1cbb-4abd-90e3-9e7f349d9cfd";

interface Conversation {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  updated_at: string;
  other_nickname?: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface FriendProfile {
  user_id: string;
  nickname: string | null;
  avatar_url?: string | null;
}

const quickQuestions = ["Ini masih ada?", "Bisa info lebih detail?", "Cara transaksinya bagaimana?"];

const ChatPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [showMyQr, setShowMyQr] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanControlsRef = useRef<any>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const friendQrValue = user ? `${window.location.origin}/chat?friend=${user.id}` : "";

  const getFriendIdFromCode = (value: string) => {
    try {
      if (value.startsWith("rosyfriend:")) return value.replace("rosyfriend:", "").trim();
      const url = new URL(value);
      return url.searchParams.get("friend") || "";
    } catch {
      return value.trim();
    }
  };

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("conversations" as any)
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    const convs = (data || []) as any[];
    const otherIds = Array.from(new Set(convs.map((c) => c.buyer_id === user.id ? c.seller_id : c.buyer_id)));
    const { data: profiles } = otherIds.length
      ? await supabase.from("profiles" as any).select("user_id, nickname").in("user_id", otherIds)
      : { data: [] as any[] };

    setConversations(convs.map((c) => ({
      ...c,
      other_nickname: (profiles as any[] || []).find((p) => p.user_id === (c.buyer_id === user.id ? c.seller_id : c.buyer_id))?.nickname || "User",
    })));
    setLoading(false);
  }, [user]);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships" as any)
      .select("requester_id, addressee_id")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const ids = Array.from(new Set(((data || []) as any[]).map((row) => row.requester_id === user.id ? row.addressee_id : row.requester_id)));
    if (!ids.length) { setFriends([]); return; }
    const { data: profiles } = await supabase
      .from("profiles" as any)
      .select("user_id, nickname, avatar_url")
      .in("user_id", ids);
    setFriends((profiles || []) as FriendProfile[]);
  }, [user]);

  const addFriend = useCallback(async (friendId: string) => {
    if (!user || !friendId) return;
    if (friendId === user.id) { toast.error("Itu QR akun kamu sendiri"); return; }

    const first = user.id < friendId ? user.id : friendId;
    const second = user.id < friendId ? friendId : user.id;
    const { error } = await supabase.from("friendships" as any).insert({
      requester_id: first,
      addressee_id: second,
      status: "accepted",
    } as any);

    if (error && !error.message?.toLowerCase().includes("duplicate")) {
      toast.error(error.message || "Gagal menambahkan teman");
      return;
    }
    toast.success(error ? "Kalian sudah berteman" : "Teman berhasil ditambahkan");
    await fetchFriends();
  }, [fetchFriends, user]);

  const openFriendChat = async (friendId: string) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from("conversations" as any)
      .select("*")
      .is("listing_id", null)
      .or(`and(buyer_id.eq.${user.id},seller_id.eq.${friendId}),and(buyer_id.eq.${friendId},seller_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) { setActiveConversation((existing as any).id); return; }
    const { data, error } = await supabase.from("conversations" as any).insert({
      buyer_id: user.id,
      seller_id: friendId,
      listing_id: null,
    } as any).select().single();
    if (error) { toast.error("Gagal membuka chat teman"); return; }
    await fetchConversations();
    setActiveConversation((data as any).id);
  };

  useEffect(() => {
    const convId = searchParams.get("conversation");
    if (convId) setActiveConversation(convId);
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    fetchConversations();
    fetchFriends();
  }, [fetchConversations, fetchFriends, user]);

  useEffect(() => {
    const friendId = searchParams.get("friend");
    if (user && friendId) addFriend(friendId);
  }, [addFriend, searchParams, user]);

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

    const channel = supabase
      .channel(`messages-${activeConversation}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConversation}`,
      }, (payload: any) => setMessages((prev) => [...prev, payload.new as ChatMessage]))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!showScanner || !videoRef.current) return;
    const reader = new BrowserQRCodeReader();
    reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
      if (!result) return;
      const friendId = getFriendIdFromCode(result.getText());
      scanControlsRef.current?.stop();
      setShowScanner(false);
      addFriend(friendId);
    }).then((controls) => {
      scanControlsRef.current = controls;
    }).catch(() => {
      toast.error("Kamera tidak bisa dibuka");
      setShowScanner(false);
    });
    return () => scanControlsRef.current?.stop();
  }, [addFriend, showScanner]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !activeConversation) return;
    const content = input.trim();
    setInput("");
    await supabase.from("messages" as any).insert({ conversation_id: activeConversation, sender_id: user.id, content } as any);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] px-4">
        <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-sm font-semibold text-foreground mb-2">Login untuk mulai chat</p>
        <button onClick={() => navigate("/auth")} className="rosi-gradient text-primary-foreground px-6 py-2 rounded-full text-sm font-bold">Login</button>
      </div>
    );
  }

  if (activeConversation) {
    const conv = conversations.find((c) => c.id === activeConversation);
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)]">
        <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-3">
          <button onClick={() => setActiveConversation(null)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          <div className="flex items-center gap-1">
            <p className="font-bold text-foreground text-sm">{conv?.other_nickname || "Chat"}</p>
            {conv && (conv.seller_id === ROSY_OFFICIAL_ID || conv.buyer_id === ROSY_OFFICIAL_ID) && <BadgeCheck className="w-4 h-4 text-primary fill-primary" />}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.sender_id === user.id ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${msg.sender_id === user.id ? "rosi-gradient text-primary-foreground rounded-br-sm" : "bg-card border border-border text-foreground rounded-bl-sm"}`}>
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
            {quickQuestions.map((q) => <button key={q} onClick={() => setInput(q)} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-xs font-semibold whitespace-nowrap">{q}</button>)}
          </div>
        )}

        <div className="px-4 py-3 border-t border-border">
          <div className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Ketik pesan..." className="flex-1 bg-card border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={sendMessage} disabled={!input.trim()} className="w-10 h-10 rosi-gradient rounded-full flex items-center justify-center disabled:opacity-40"><Send className="w-4 h-4 text-primary-foreground" /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-4 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Chat</h1>
          <p className="text-sm text-muted-foreground">Chat market dan teman Rosy</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowMyQr(true)} className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center"><QrCode className="w-5 h-5" /></button>
          <button onClick={() => setShowScanner(true)} className="w-10 h-10 rounded-full rosi-gradient text-primary-foreground flex items-center justify-center"><ScanLine className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-foreground text-sm">Teman</h2>
        </div>
        {friends.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada teman. Scan QR akun Rosy teman kamu.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {friends.map((friend) => (
              <button key={friend.user_id} onClick={() => openFriendChat(friend.user_id)} className="min-w-20 flex flex-col items-center gap-2 rounded-xl bg-background border border-border p-2">
                {friend.avatar_url ? <img src={friend.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-secondary-foreground">{(friend.nickname || "U")[0].toUpperCase()}</div>}
                <span className="text-[11px] font-semibold text-foreground truncate max-w-16">{friend.nickname || "User"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4"><MessageCircle className="w-8 h-8 opacity-50" /></div>
          <p className="text-sm font-semibold">Belum ada pesan</p>
          <p className="text-xs mt-1">Mulai chat dari listing atau teman</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <button key={conv.id} onClick={() => setActiveConversation(conv.id)} className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-xl text-left">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"><span className="text-sm font-bold text-secondary-foreground">{(conv.other_nickname || "U")[0].toUpperCase()}</span></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-bold text-foreground">{conv.other_nickname}</p>
                  {(conv.seller_id === ROSY_OFFICIAL_ID || conv.buyer_id === ROSY_OFFICIAL_ID) && <BadgeCheck className="w-3.5 h-3.5 text-primary fill-primary" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">{new Date(conv.updated_at).toLocaleDateString("id-ID")}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showMyQr && (
        <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center px-6">
          <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card rounded-2xl p-6 w-full max-w-sm space-y-4 text-center">
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-foreground">QR Teman Rosy</h3><button onClick={() => setShowMyQr(false)}><X className="w-5 h-5 text-muted-foreground" /></button></div>
            <div className="bg-background rounded-xl p-4 flex justify-center"><QRCodeSVG value={friendQrValue} size={220} level="M" /></div>
            <p className="text-xs text-muted-foreground">Teman kamu bisa scan QR ini untuk berteman.</p>
            <button onClick={() => navigator.clipboard.writeText(friendQrValue).then(() => toast.success("Link teman disalin"))} className="w-full rosi-gradient text-primary-foreground rounded-xl py-3 text-sm font-bold">Salin Link Teman</button>
          </motion.div>
        </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 z-50 bg-foreground/70 flex items-center justify-center px-6">
          <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card rounded-2xl p-4 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-foreground">Scan QR Teman</h3><button onClick={() => setShowScanner(false)}><X className="w-5 h-5 text-muted-foreground" /></button></div>
            <video ref={videoRef} className="w-full aspect-square rounded-xl bg-muted object-cover" muted playsInline />
            <p className="text-xs text-muted-foreground text-center">Arahkan kamera ke QR akun Rosy teman.</p>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
