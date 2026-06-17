# 📌 PinQuo 

> **"The classic quote-meme engine for your social circle."**

PinQuo turns hilarious, out-of-context, or legendary quotes your friends say into beautiful, shareable meme cards. PinQuo styles, preserves, and elevates the best quotes natively.

---

## ✨ Features

* **🎨 Dynamic Meme-Card Generator:** Automatically scales and adjusts text sizes so quotes *never* overflow or scroll.
* **👤 Avatar Blend Mode:** Uses neutral backdrops combined with natural user profile pictures to create sleek, custom card backgrounds.
* **📩 Viral Invite Flywheel:** Want to quote someone who isn't on the app yet? Tag their email. PinQuo automatically ships a beautiful HTML invitation via **Resend**.
* **⚡ Auto-Claim Engine:** The second an invited user signs up, a secure Postgres Trigger retroactively claims all their quotes and upgrades "Pending Invite" cards to real profiles instantly.
* **🔄 Scalable Core Feed:** Fully equipped with **Infinite Pagination** (loading batches of 5) and a **Debounced Realtime User Search Bar** to prevent server lag.
* **❤️ Realtime Social Actions:** Smooth, optimistic UI updates for reactions, comments and a global **Favorites** system.

Im working on QoL updates and new features to keep the project alive.

---

## 🛠️ The Tech Stack

* **Framework:** Next.js (App Router, Route Handlers)
* **Language:** TypeScript (Strictly typed schemas)
* **Database & Auth:** Supabase (PostgreSQL with strict Row Level Security enabled)
* **Styling:** Tailwind4
* **Icons:** Lucide React
* **Email Infrastructure:** Resend

---

## 📐 Database Schema Architecture  

PinQuo utilizes a highly normalized PostgreSQL relational schema protected by a secure RLS (Row Level Security) firewall layer.