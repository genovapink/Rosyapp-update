# Project Memory

## Core
Mobile-first React SPA for waste management. Target audience: general public & children.
Primary color: Green (#7fb375). Earthy tones.
All stats (Home, Profile) MUST use real-time DB data. NO mock data.
Backend: Supabase via Lovable Cloud ONLY. Do not use personal/external Supabase accounts.
Web3: Wagmi, Viem, RainbowKit on Base network.
Multi-language support (ID, EN, ZH) via header hamburger menu.
Free tier: 3 listings + 30 scans/bulan. Premium: 10 + 100. Earn 1 pt/scan, 5 pts/listing. Redeem at /redeem.

## Memories
- [Branding & Identity](mem://style/branding) — Visual identity, primary colors, mascot, and official account badge
- [Intro Animation](mem://style/intro-animation) — Loading animation sequence showing the logo and typing effect
- [Tech Architecture](mem://tech/architecture) — React SPA, Tailwind, Supabase (Lovable Cloud only), and Web3 integrations
- [Auth & Redirection](mem://auth/redirection) — Required redirect URLs and routes for Supabase auth flow
- [AI Scan](mem://features/ai-scan) — Garbage scanning using Gemini 2.5 Flash, returning step-by-step Indonesian instructions
- [Marketplace](mem://features/marketplace) — Trash marketplace with CRUD, favorites, 15MB upload limit, and scan-to-listing
- [Real-time Chat](mem://features/chat) — Supabase Realtime chat between buyers and sellers in the Marketplace
- [Social Sharing](mem://features/social-sharing) — X (Twitter) and Instagram sharing for scan results with @4anakmasadepan attribution
- [Monetization & Ads](mem://features/monetization) — Ad system with manual fiat and Web3 crypto payments, displayed as a carousel on Home
- [Education](mem://features/education) — 'Coming Soon' educational guide accessed via Home banner to /rosycourse
- [Admin Panel](mem://features/admin-panel) — Hidden admin panel at /adminros for managing ads, listings, users, rewards, premium, warnings
- [Premium, Limits & Rewards](mem://features/premium-limits) — Tier limits, point earning, voucher redeem, premium upgrade channels
