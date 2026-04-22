---
name: Premium, Limits & Rewards System
description: Free vs Premium tiers (3/30 vs 10/100 monthly), points-per-action, blue checkmark, redeem voucher digital, admin panel controls
type: feature
---
## Tiers
- Free: 3 listings/bln, 30 scans/bln
- Premium: 10 listings/bln, 100 scans/bln, avatar upload, blue checkmark
- Tracked in `usage_counters` (period = 'YYYY-MM') by `useUsageLimits` hook

## Points
- +1 Rosy Point per scan, +5 per listing (auto via `awardPoints`)
- Redeem voucher digital di /redeem (pakai tabel rewards + reward_codes)
- 500 pts = 1 bulan Premium

## Premium upgrade (3 channels at /premium)
- Manual WA admin: +62 882-4215-0920
- Bayar 5 USDC Base ke 0x0E3fCDD57e0B52a42E83D1B7bc5D75f782076057
- Tukar 500 Rosy Points (otomatis aktif)

## Admin (/adminros, password 317130G)
- Tab: Iklan, Market, Users, Reward
- Toggle premium 30 hari, ban/unban, kirim warning
- CRUD reward + upload kode voucher batch (1 per baris)
- Hapus listing permanent

## DB tables
user_roles, usage_counters, rewards, reward_codes, redemptions, warnings, premium_subscriptions
profiles + columns: is_premium, premium_until, is_official, is_banned

Admin role granted to user 352cfaa2-1cbb-4abd-90e3-9e7f349d9cfd
