import { createContext, useContext, useState, ReactNode } from "react";

type Language = "id" | "en" | "zh";

const translations: Record<string, Record<Language, string>> = {
  // Home
  "home.title": { id: "Rosy", en: "Rosy", zh: "Rosy" },
  "home.hi": { id: "Hi", en: "Hi", zh: "你好" },
  "home.hero.title": { id: "Scan Sampahmu,\nSelamatkan Bumi 🌍", en: "Scan Your Waste,\nSave the Earth 🌍", zh: "扫描你的垃圾，\n拯救地球 🌍" },
  "home.hero.subtitle": { id: "Dapatkan Poin Rosy & bantu kurangi sampah", en: "Earn Rosy Points & help reduce waste", zh: "获取Rosy积分，帮助减少垃圾" },
  "home.hero.button": { id: "Scan Sekarang", en: "Scan Now", zh: "立即扫描" },
  "home.trash_lesson": { id: "Trash Lesson", en: "Trash Lesson", zh: "垃圾课堂" },
  "home.trash_lesson.desc": { id: "Pelajari mengolah sampahmu", en: "Learn to process your waste", zh: "学习处理你的垃圾" },
  "home.stats.scans": { id: "Sampah Di-scan", en: "Waste Scanned", zh: "已扫描垃圾" },
  "home.stats.recycled": { id: "Didaur Ulang", en: "Recycled", zh: "已回收" },
  "home.stats.users": { id: "Pengguna Aktif", en: "Active Users", zh: "活跃用户" },
  "home.categories.title": { id: "Kenali Sampahmu", en: "Know Your Waste", zh: "了解你的垃圾" },
  "home.scan_waste": { id: "Scan Sampah", en: "Scan Waste", zh: "扫描垃圾" },
  "home.market_waste": { id: "Market Sampah", en: "Waste Market", zh: "垃圾市场" },
  "home.ad_space": { id: "Ruang Iklan 300×250", en: "Ad Space 300×250", zh: "广告位 300×250" },
  "home.ad_contact": { id: "Hubungi kami untuk beriklan", en: "Contact us to advertise", zh: "联系我们投放广告" },
  "home.suggestion": { id: "Punya usulan atau laporan?", en: "Have suggestions or reports?", zh: "有建议或报告？" },
  "home.send_message": { id: "Kirim pesan langsung", en: "Send direct message", zh: "发送直接消息" },
  // Categories
  "cat.plastik": { id: "Plastik", en: "Plastic", zh: "塑料" },
  "cat.kaca": { id: "Kaca", en: "Glass", zh: "玻璃" },
  "cat.kertas": { id: "Kertas", en: "Paper", zh: "纸张" },
  "cat.logam": { id: "Logam", en: "Metal", zh: "金属" },
  "cat.organik": { id: "Organik", en: "Organic", zh: "有机物" },
  "cat.elektronik": { id: "Elektronik", en: "Electronic", zh: "电子产品" },
  // Nav
  "nav.home": { id: "Home", en: "Home", zh: "首页" },
  "nav.market": { id: "Market", en: "Market", zh: "市场" },
  "nav.scan": { id: "Scan", en: "Scan", zh: "扫描" },
  "nav.chat": { id: "Chat", en: "Chat", zh: "聊天" },
  "nav.profile": { id: "Profil", en: "Profile", zh: "个人" },
  // Profile
  "profile.not_logged": { id: "Belum Login", en: "Not Logged In", zh: "未登录" },
  "profile.login_desc": { id: "Masuk untuk menyimpan riwayat scan dan poin Rosy kamu", en: "Login to save your scan history and Rosy points", zh: "登录以保存扫描记录和Rosy积分" },
  "profile.login_btn": { id: "Login / Daftar", en: "Login / Register", zh: "登录 / 注册" },
  "profile.stats_title": { id: "Statistik Kamu", en: "Your Statistics", zh: "你的统计" },
  "profile.total_scan": { id: "Total Scan", en: "Total Scans", zh: "总扫描次数" },
  "profile.waste_saved": { id: "Sampah Terselamatkan", en: "Waste Saved", zh: "已挽救垃圾" },
  "profile.rosy_points": { id: "Poin Rosy", en: "Rosy Points", zh: "Rosy积分" },
  "profile.account": { id: "Account", en: "Account", zh: "账户" },
  "profile.scan_history": { id: "Riwayat Scan", en: "Scan History", zh: "扫描历史" },
  "profile.transaction_history": { id: "Riwayat Transaksi", en: "Transaction History", zh: "交易历史" },
  "profile.settings": { id: "Settings", en: "Settings", zh: "设置" },
  "profile.logout": { id: "Log Out", en: "Log Out", zh: "退出" },
  "profile.edit": { id: "Edit Profile", en: "Edit Profile", zh: "编辑个人资料" },
  "profile.save": { id: "Save Changes", en: "Save Changes", zh: "保存更改" },
  "profile.advertise": { id: "Advertise with Us", en: "Advertise with Us", zh: "与我们合作推广" },
  "profile.advertise.desc": { id: "Promote your business on Rosy", en: "Promote your business on Rosy", zh: "在Rosy上推广你的业务" },
  // Advertise
  "ad.title": { id: "Advertise with Us", en: "Advertise with Us", zh: "与我们合作推广" },
  "ad.subtitle": { id: "Promosikan produk/toko kamu di Rosy", en: "Promote your product/store on Rosy", zh: "在Rosy上推广你的产品/商店" },
  "ad.payment_method": { id: "Pilih Metode Pembayaran:", en: "Choose Payment Method:", zh: "选择支付方式：" },
  "ad.manual": { id: "Manual", en: "Manual", zh: "手动" },
  "ad.crypto": { id: "Crypto", en: "Crypto", zh: "加密货币" },
  "ad.connect_wallet": { id: "Connect MetaMask Wallet", en: "Connect MetaMask Wallet", zh: "连接MetaMask钱包" },
  "ad.detail": { id: "Detail Iklan:", en: "Ad Details:", zh: "广告详情：" },
  "ad.upload": { id: "Upload Gambar Produk/Toko", en: "Upload Product/Store Image", zh: "上传产品/商店图片" },
  "ad.name": { id: "Nama Produk/Toko", en: "Product/Store Name", zh: "产品/商店名称" },
  "ad.desc": { id: "Deskripsi singkat (opsional)", en: "Short description (optional)", zh: "简短描述（可选）" },
  "ad.price_info": { id: "💡 Info Harga:", en: "💡 Pricing Info:", zh: "💡 价格信息：" },
  "ad.duration": { id: "Durasi: 30 hari", en: "Duration: 30 days", zh: "时长：30天" },
  "ad.price_wa": { id: "Harga: Rp 150.000", en: "Price: Rp 150,000", zh: "价格：Rp 150,000" },
  "ad.price_base": { id: "Harga: $8 USDC", en: "Price: $8 USDC", zh: "价格：$8 USDC" },
  "ad.discount": { id: "🔥 DISKON 50% untuk 10 pembeli pertama! Hanya $4 USDC", en: "🔥 50% OFF for first 10 buyers! Only $4 USDC", zh: "🔥 前10位买家五折优惠！仅需$4 USDC" },
  "ad.network": { id: "Network: Base (Ethereum L2)", en: "Network: Base (Ethereum L2)", zh: "网络：Base（以太坊L2）" },
  "ad.wa_btn": { id: "Hubungi via WhatsApp", en: "Contact via WhatsApp", zh: "通过WhatsApp联系" },
  "ad.base_btn": { id: "Bayar $8 USDC di Base", en: "Pay $8 USDC on Base", zh: "在Base上支付$8 USDC" },
  "ad.base_btn_discount": { id: "Bayar $4 USDC di Base (DISKON 50%)", en: "Pay $4 USDC on Base (50% OFF)", zh: "在Base上支付$4 USDC（五折）" },
  "ad.processing": { id: "Memproses...", en: "Processing...", zh: "处理中..." },
  "ad.success_title": { id: "Iklan Berhasil Dikirim!", en: "Ad Successfully Submitted!", zh: "广告提交成功！" },
  "ad.success_wa": { id: "Tim kami akan mengkonfirmasi pembayaran via WhatsApp.", en: "Our team will confirm payment via WhatsApp.", zh: "我们的团队将通过WhatsApp确认付款。" },
  "ad.success_base": { id: "Iklan kamu aktif selama 30 hari.", en: "Your ad is active for 30 days.", zh: "你的广告有效期为30天。" },
  "ad.back_home": { id: "Kembali ke Home", en: "Back to Home", zh: "返回首页" },
  "ad.back": { id: "Kembali", en: "Back", zh: "返回" },
  // Language
  "lang.title": { id: "Bahasa", en: "Language", zh: "语言" },
  "lang.id": { id: "Bahasa Indonesia", en: "Bahasa Indonesia", zh: "印尼语" },
  "lang.en": { id: "English", en: "English", zh: "英语" },
  "lang.zh": { id: "中文 (Mandarin)", en: "中文 (Mandarin)", zh: "中文（普通话）" },
  // Footer
  "footer.tagline": { id: "Reduce • Reuse • Recycle", en: "Reduce • Reuse • Recycle", zh: "减量 • 再利用 • 回收" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "id",
  setLanguage: () => {},
  t: (key: string) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem("rosy-lang") as Language) || "id";
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("rosy-lang", lang);
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
