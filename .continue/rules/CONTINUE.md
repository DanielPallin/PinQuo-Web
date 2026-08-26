Apply
# 📌 PinQuo - Project Guide

> **"The classic quote-meme engine for your social circle."**

## 🎯 Project Overview

PinQuo is a social media platform that transforms humorous, out-of-context, or legendary statements from friends into beautiful, shareable quote-template cards. The application features dynamic meme generation, user profiles, real-time interactions, and an invite-based growth system.

### Key Features
- **Dynamic Meme-Card Generator:** Automatically scales text to prevent overflow
- **Avatar Blend Mode:** Uses profile pictures with custom styling
- **Viral Invite Flywheel:** Email invitations for users not yet on the platform
- **Auto-Claim Engine:** Retroactively claims quotes when invited users sign up
- **Scalable Feed:** Infinite pagination (5 items/batch) + debounced user search
- **Realtime Social Actions:** Optimistic UI updates for reactions, comments, and favorites

### Tech Stack
- **Framework:** Next.js 16.2.7
- **Language:** TypeScript 5
- **Database & Auth:** Supabase (supabase-js 2.107.0)
- **Styling:** Tailwind CSS 4
- **Icons:** Lucide React
- **State Management:** React hooks with centralized interaction logic

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20 or later recommended)
- npm or yarn package manager
- Supabase project with the required database schema
- Environment variables (see Configuration section)

### Installation

1. **Clone the repository:**
   ```bash
   git clone [your-repo-url]
   cd pinquo-web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   
   Create a `.env.local` file in the root directory with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```
   
   For server-side operations, also add:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`

### Basic Usage

1. Navigate to `/feed` to view the main feed of quotes
2. Click on a quote card to expand and view details/comments
3. Use the search bar (top-right when scrolling down) to find users
4. Interact with quotes using reactions, comments, or favorites

---

## 📁 Project Structure

```
.
├── app/                          # Next.js App Router pages
│   ├── (main)/                   # Main authenticated section
│   │   ├── [username]/           # User profile routes
│   │   │   ├── published/        # Quotes the user published
│   │   │   └── quoted-in/        # Quotes the user was quoted in
│   │   ├── create/               # Quote creation flow
│   │   │   ├── write/            # Write quote form with template selection
│   │   │   └── preview/          # Preview before publishing
│   │   ├── feed/                 # Main feed page
│   │   ├── profile/              # User profile management
│   │   │   ├── edit/             # Edit profile settings
│   │   │   └── favourites/       # View favorited quotes
│   │   ├── settings/             # Application settings
│   │   │   ├── notifications/    # Notification preferences
│   │   │   ├── blocklist/        # Blocked users management
│   │   │   └── subscription/     # Subscription management
│   │   └── templates/            # Template management
│   │       └── pack/[id]/        # Individual template packs
│   ├── api/                      # API routes
│   │   ├── invite/               # Invitation email handling
│   │   ├── notify/               # Notification system
│   │   └── witness-invite/       # Witness invitation flow
│   ├── login/                    # Authentication page
│   └── layout.tsx                # Root layout with theme provider
├── components/                   # Reusable React components
│   ├── CustomEmojiPicker.tsx     # Custom emoji picker wrapper
│   ├── Header.tsx                # Application header
│   ├── NotificationBell.tsx      # Notification indicator
│   ├── QuoteCard.tsx             # Main quote display component
│   ├── SidebarWidgets.tsx        # Sidebar utility widgets
│   ├── TemplateCard.tsx          # Template display card
│   ├── ThemeProvider.tsx         # Theme context provider
│   ├── ThemeToggle.tsx           # Dark/light mode toggle
│   └── WitnessManager.tsx        # Witness (tagged users) manager
├── hooks/                        # Custom React hooks
│   ├── useIsMobile.ts            # Mobile detection hook
│   └── useQuoteInteractions.ts   # Shared quote interaction logic
├── lib/supabase/                 # Supabase client configuration
│   ├── client.ts                 # Browser client
│   └── server.ts                 # Server-side client
├── types/                        # TypeScript type definitions
│   └── quote.ts                  # Quote-related types
├── public/                       # Static assets
├── .continue/                    # AI assistant configuration
└── supabase/                     # Supabase migrations and functions
```

### Key Files

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout with theme provider, fonts (Plus Jakarta Sans + Playfair Display) |
| `lib/supabase/client.ts` | Browser-side Supabase client creation |
| `components/QuoteCard.tsx` | Main quote display component with reactions, comments, witnesses |
| `hooks/useQuoteInteractions.ts` | Shared hook for handling reactions, comments, favorites |
| `app/(main)/feed/page.tsx` | Main feed page with infinite pagination |
| `app/(main)/create/write/page.tsx` | Quote creation interface with template selection and live camera |
| `proxy.ts` | Server-side middleware for route protection and redirects |

---

## 🏗️ Development Workflow

### Coding Standards
1. **TypeScript**: Strict mode enabled (`strict: true` in tsconfig.json)
2. **Component Structure**: 
   - Use functional components with TypeScript interfaces
   - Follow React hooks rules (no conditional hooks, no hooks in loops)
   - Keep components focused and single-purpose
3. **Styling**: 
   - Tailwind CSS utility classes only
   - Avoid custom CSS files when possible
   - Use responsive prefixes for mobile-first design
4. **State Management**:
   - Local state with `useState` for UI interactions
   - Shared state through context or lifting up
   - Optimistic updates for better UX

### Testing Approach
- Unit tests for critical logic (e.g., quote formatting, reaction toggling)
- Manual testing of user flows in development mode
- Test on both mobile and desktop viewports

### Build and Deployment

**Production Build:**
```bash
npm run build
npm start
```

**Environment Variables for Production**
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Contribution Guidelines

1. **Branch Strategy**: Use feature branches for new functionality
2. **Code Review**: All changes should be reviewed before merging
3. **Commit Messages**: Follow conventional commit format:
   ```
   feat: add witness verification system
   fix: resolve quote overflow in mobile view
   docs: update project structure documentation
   ```

---

## 🔑 Key Concepts

### Domain-Specific Terminology
- **Quote**: A statement attributed to a person, styled as a shareable card
- **Witness**: Users tagged in a quote who can verify its authenticity
- **Template**: Pre-designed visual styles for quote cards
- **Live Snap**: Real-time camera capture used as a background for quotes
- **Pack**: Group of related templates (e.g., "Summer Vibes", "Funny Moments")

### Core Abstractions

#### Quote Data Model
```typescript
interface FeedQuote {
  id: string;
  content: string;
  created_at: string;
  quoted_email: string | null;
  custom_author_name: string | null;
  live_photo_url: string | null;
  publisher: { id, username, avatar_url } | null;
  quoted_user: { id, username, avatar_url } | null;
  template: { style_config, image_url } | null;
  groupedReactions: GroupedReaction[];
  commentCount: number;
  favoriteCount: number;
  isFavorited: boolean;
  witnesses?: WitnessRecord[];
}
```

#### Template System
- **Free Templates**: Accessible to all users
- **Pro Templates**: Available only to Pro subscribers
- **Template Packs**: Collections of related templates with a cover image

### Design Patterns Used
1. **Optimistic UI Updates**: Immediate state changes before server confirmation
2. **Debounced Search**: Delayed search execution to reduce API calls
3. **Infinite Pagination**: Cursor-based loading with IntersectionObserver
4. **RLS (Row Level Security)**: Database-level access control for data security
5. **Context Providers**: Theme management, Supabase client sharing

---

## 🛠️ Common Tasks

### Adding a New Feature to Quote Cards
1. Update the `FeedQuote` type in `types/quote.ts`
2. Modify `formatQuote()` function in `app/(main)/feed/page.tsx`
3. Implement UI changes in `components/QuoteCard.tsx`

### Modifying Template System
1. Add new templates via Supabase dashboard or migrations
2. Update template tier logic in `app/(main)/create/write/page.tsx`
3. Modify CSS classes for visual changes

### Working with Supabase Triggers
- Review `supabase/` directory for existing triggers
- Key triggers handle:
  - Auto-claiming quotes when invited users sign up
  - Notification generation on reactions/comments
  - Witness verification status updates

### Debugging Authentication Issues
1. Check environment variables are set correctly
2. Verify Supabase project settings (JWT expiration, OAuth providers)
3. Test with `console.log(supabase.auth.getUser())` in components

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "Supabase client not found" error
**Cause**: Missing environment variables or incorrect configuration  
**Solution**: 
- Verify `.env.local` has correct values
- Check that `createClient()` is using correct keys

#### 2. Quote cards not displaying correctly
**Cause**: Template data missing or malformed  
**Solution**:
```typescript
// Add fallbacks for template properties
const bgGradient = quote.template?.style_config?.gradient || 'from-slate-800 to-slate-900'
```

#### 3. Camera not working in create flow
**Cause**: Missing permissions or insecure context  
**Solution**:
- Ensure development server uses HTTPS (`ngrok` for local testing)
- Grant camera permissions when prompted

#### 4. Infinite scroll stops loading
**Cause**: Pagination boundary reached or API limits  
**Solution**:
```typescript
// Check if more items exist
if (formattedQuotes.length < ITEMS_PER_PAGE) setHasMore(false)
```

### Debugging Tips
1. Use React DevTools to inspect component state
2. Monitor network tab for Supabase API calls
3. Enable Supabase dashboard query logging
4. Add `console.log` statements in hooks for state tracking

---

## 📚 References

### Official Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/reference)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Important Resources
- **Project Repository**: [Link to your repository]
- **Design Assets**: [Link to Figma/Adobe XD files]
- **Database Schema Diagram**: See `supabase/migrations/` directory

### Key Dependencies
```json
{
  "next": "16.2.7",           // React framework with App Router
  "react": "19.2.4",          // UI library
  "@supabase/supabase-js": "^2.107.0", // Database client
  "tailwindcss": "^4",        // CSS framework
  "lucide-react": "^1.17.0"   // Icon set
}
```

---

## 🎯 Quick Reference

### Essential Commands
```bash
npm run dev      # Start development server
npm run build    # Create production bundle
npm start        # Run production server
npm run lint     # Lint code with ESLint