# Secure Pharma Networker Dashboard - SPEC.md

## 1. Concept & Vision

A **high-conversion, dopamine-driven MLM dashboard** that feels like a premium fintech app (Stripe/Binance level). The UI maximizes user engagement through real-time earnings visualization, gamification elements, and smooth micro-interactions. Every screen is designed to push users toward daily login and active recruitment. Dark mode default with glassmorphism effects creates a premium crypto-trading aesthetic that signals legitimacy and wealth.

---

## 2. Design Language

### Aesthetic Direction
**Reference**: Stripe Dashboard + Binance Pro + Zerodha Console hybrid
- Premium fintech look with glassmorphism cards
- Deep dark backgrounds with subtle gradients
- Glowing accent colors for key metrics
- Soft shadows and rounded corners throughout

### Color Palette

```css
/* Dark Mode (Default) */
--background: #0a0a0f;
--background-secondary: #12121a;
--card-bg: rgba(255, 255, 255, 0.03);
--card-border: rgba(255, 255, 255, 0.08);
--card-hover: rgba(255, 255, 255, 0.06);

/* Primary Brand */
--primary: #10b981;        /* Emerald green - growth/profit */
--primary-light: #34d399;
--primary-glow: rgba(16, 185, 129, 0.3);

/* Secondary */
--secondary: #6366f1;      /* Indigo - actions */
--secondary-light: #818cf8;

/* Accents */
--accent-gold: #f59e0b;    /* Gold - premium/rank */
--accent-gold-glow: rgba(245, 158, 11, 0.3);
--accent-red: #ef4444;     /* Red - alerts/losses */
--accent-blue: #3b82f6;    /* Blue - informational */

/* Text */
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.7);
--text-muted: rgba(255, 255, 255, 0.4);

/* Light Mode */
--light-background: #f8fafc;
--light-card-bg: #ffffff;
--light-text-primary: #0f172a;
--light-text-secondary: #475569;
```

### Typography

```css
/* Font Family */
--font-display: 'Inter', -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* Scale */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
--text-5xl: 3rem;        /* 48px */
```

### Spatial System

```css
/* Spacing */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */

/* Border Radius */
--radius-sm: 0.5rem;     /* 8px */
--radius-md: 0.75rem;    /* 12px */
--radius-lg: 1rem;       /* 16px */
--radius-xl: 1.5rem;     /* 24px */
--radius-full: 9999px;
```

### Motion Philosophy

```css
/* Durations */
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 400ms;
--duration-slower: 600ms;

/* Easings */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Animations */
- Card hover: scale(1.02), subtle glow, shadow lift (250ms)
- Number counters: count-up animation on mount
- Progress bars: width transition with ease-out (400ms)
- Page transitions: fade + slide up (300ms staggered)
- Earnings updates: pulse glow effect
- Skeleton loaders: shimmer gradient animation
```

### Visual Assets

```css
/* Shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.4);
--shadow-glow: 0 0 30px rgba(16, 185, 129, 0.2);

/* Gradients */
--gradient-primary: linear-gradient(135deg, #10b981 0%, #059669 100%);
--gradient-gold: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
--gradient-bg: radial-gradient(ellipse at top, #1a1a2e 0%, #0a0a0f 100%);
--gradient-card: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%);
```

---

## 3. Layout & Structure

### Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR (collapsed on mobile)                              │
│  ┌─────────┐ ┌─────────────────────────────────────────────┐│
│  │ Logo    │ │  Header (user info, notifications, theme)  ││
│  │ Nav     │ ├─────────────────────────────────────────────┤│
│  │ Items   │ │                                             ││
│  │         │ │  MAIN CONTENT AREA                          ││
│  │ User    │ │  (scrollable, page-specific)                ││
│  │ Status  │ │                                             ││
│  └─────────┘ └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Sidebar (280px width, collapsible to 72px)

- Logo at top with app name
- Navigation items with icons + labels
- Active state: green left border + glow
- User card at bottom with avatar, name, rank
- Collapse toggle for mobile

### Header (64px height)

- Page title (left)
- Search (center)
- Notifications bell + Badge
- Theme toggle
- User avatar dropdown

### Content Area

- Max-width: 1400px centered
- Padding: 24px (mobile: 16px)
- Grid gap: 24px

---

## 4. Features & Interactions

### Dashboard Screen

**Earnings Overview Section**
- Total Earnings card (big, prominent, with animated counter)
- Today's Earnings (real-time update simulation)
- Weekly Earnings (bar chart mini-preview)
- Monthly Earnings (trend indicator)

**Wallets Section**
- Secure Coin Wallet (with coin icon, balance, glow effect)
- Commission Wallet (with wallet icon)
- Quick actions: Convert, Transfer, Withdraw

**Binary Status Widget**
- Two-column display: LEFT vs RIGHT
- Visual progress bars showing balance
- "Matching" indicator when balanced
- Active user count per side

**Earnings Chart**
- Line chart showing 7-day/30-day/90-day trends
- Toggle between views
- Hover tooltips with exact values
- Gradient fill under the line

**Quick Actions Grid**
- Invite button (prominent, green)
- Withdraw button
- Upgrade Package button
- Transfer button

**Recent Activity Feed**
- List of recent events
- Icons for each type (join, income, withdrawal)
- Relative timestamps
- Click to expand details

**Daily Streak Widget**
- Current streak count
- Calendar dots for past 7 days
- Reward indicator for maintaining streak

### Invite & Earn Screen

**Hero Section**
- Headline: "Invite & Earn Together"
- Subtext with commission rates

**Referral Link Card**
- Large input with link
- Copy button (with success feedback)
- QR Code generation (right side)

**Left/Right Toggle**
- Prominent toggle selector
- Explanation of binary placement
- Current count per side

**Share Buttons**
- WhatsApp (primary)
- Telegram
- Facebook
- Twitter/X
- Native share (mobile)

**Invite Statistics**
- Total invited count
- Active users count
- Pending placements
- Commission earned from referrals

**Recent Invites List**
- Avatar, name, join date, status
- Paginated

### Team Screen

**Binary Tree Visualization**
- Simple tree structure
- LEFT/RIGHT branches
- User count per node
- Expandable/collapsible nodes

**Team Statistics Cards**
- Total team members
- Active today
- New this week
- Total team volume

**Left Team Panel**
- Member list with search
- Filter: All/Active/Inactive
- Pagination

**Right Team Panel**
- Same as left

**Team Volume Widget**
- Left volume vs Right volume
- Progress to matching bonus

---

## 5. Component Inventory

### Cards

**StatCard**
- States: default, hover, loading
- Props: title, value, change, icon, color
- Hover: scale + shadow lift
- Loading: shimmer skeleton

**WalletCard**
- States: default, hover
- Gradient border on hover
- Icon with glow
- Balance with animated counter

**ChartCard**
- Header with title + time range toggle
- Chart area
- Tooltip on hover

### Buttons

**PrimaryButton**
- States: default, hover, active, disabled, loading
- Default: green gradient, white text
- Hover: lighter green, scale(1.02)
- Active: darker green
- Loading: spinner + disabled

**SecondaryButton**
- Outline style
- Border color changes on hover

**IconButton**
- Circle shape
- Tooltip on hover

**ActionButton**
- Card-style button
- Icon + label
- Hover: glow effect

### Inputs

**Input**
- States: default, focus, error, disabled
- Focus: green border glow
- Error: red border + message

**Select**
- Custom dropdown
- Search functionality

**Toggle**
- Animated slide
- Green when active

### Navigation

**SidebarNav**
- NavItem component
- Active state with indicator
- Tooltip when collapsed

**Breadcrumb**
- Page path display

### Data Display

**Table**
- Sortable columns
- Row hover highlight
- Pagination

**Badge**
- Variants: success, warning, error, info
- Pill shape with icon

**Avatar**
- Sizes: sm, md, lg
- Status indicator dot

**ProgressBar**
- Animated fill
- Percentage label
- Color variants

### Feedback

**Toast**
- Variants: success, error, info
- Auto-dismiss with progress bar
- Slide in from top-right

**Skeleton**
- Shimmer animation
- Shape variants

**EmptyState**
- Icon + message
- Action button

---

## 6. Technical Approach

### Framework & Architecture

```
/app
  /layout.tsx           - Root layout with providers
  /page.tsx             - Dashboard (main)
  /invite/page.tsx      - Invite & Earn
  /team/page.tsx        - Team binary structure
  /rank/page.tsx        - Rank & Progress
  /income/page.tsx      - Income details
  /wallet/page.tsx      - Wallet overview
  /withdraw/page.tsx    - Withdrawal
  /package/page.tsx     - Package upgrade
  /p2p/page.tsx         - P2P Transfer
  /support/page.tsx     - Support tickets
  /profile/page.tsx     - Profile & Settings
  /globals.css          - Global styles + CSS variables

/components
  /ui                   - shadcn/ui components
  /layout               - Sidebar, Header, etc.
  /dashboard            - Dashboard-specific
  /shared               - Shared across screens

/lib
  /utils.ts             - Utility functions
  /dummy-data.ts       - Mock data

/stores
  /useAuthStore.ts      - Auth state (Zustand)
  /useThemeStore.ts     - Theme state
```

### Key Dependencies

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "19.x",
    "typescript": "5.x",
    "tailwindcss": "latest",
    "@radix-ui/react-*": "various",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "framer-motion": "latest",
    "recharts": "latest",
    "zustand": "latest",
    "lucide-react": "latest",
    "qrcode.react": "latest",
    "date-fns": "latest"
  }
}
```

### State Management (Zustand)

```typescript
// Auth Store
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials) => Promise<void>;
  logout: () => void;
}

// Theme Store
interface ThemeState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

// Dashboard Store
interface DashboardState {
  earnings: Earnings;
  wallet: Wallet;
  fetchDashboardData: () => Promise<void>;
}
```

### Responsive Breakpoints

```css
/* Tailwind defaults */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

---

## 7. Page Specifications

### Dashboard (`/`)
Priority: CRITICAL
Time on page goal: High (stickiness)

Widgets to include:
1. Stats grid (4 cards): Total Earnings, Today, Weekly, Monthly
2. Wallets row: Secure Coin, Commission
3. Binary Status widget
4. Earnings chart (7/30/90 day toggle)
5. Quick Actions (Invite, Withdraw, Upgrade, Transfer)
6. Recent Activity feed
7. Daily Streak widget
8. Quick stats footer

### Invite (`/invite`)
Priority: CRITICAL
Goal: Maximize referral sharing

Sections:
1. Hero with headline
2. Referral link card with copy + QR
3. Left/Right placement toggle
4. Share buttons (WhatsApp primary)
5. Invite statistics
6. Recent invites list

### Team (`/team`)
Priority: HIGH
Goal: Visualize network growth

Sections:
1. Team stats cards
2. Binary tree visualization (simplified)
3. Left team panel + Right team panel (tabs)
4. Team volume comparison widget

### Rank (`/rank`)
Priority: HIGH
Goal: Drive upgrades

Sections:
1. Current rank badge (large, animated)
2. Next rank target
3. Progress bar with milestones
4. Benefits list
5. How to earn more section

### Income (`/income`)
Priority: HIGH
Goal: Show earnings breakdown

Sections:
1. Summary cards (total by type)
2. Tab navigation: Direct, Binary, Level
3. Date range filter
4. Transaction table
5. Export option

### Wallet (`/wallet`)
Priority: HIGH
Goal: Consolidate financial view

Sections:
1. Balance cards (multiple wallets)
2. Transaction history (ledger style)
3. Quick actions (withdraw, transfer)

### Withdrawal (`/withdraw`)
Priority: MEDIUM
Goal: Convert to cash

Sections:
1. Available balance
2. Withdrawal form
3. Bank/UPI details
4. History table

### Package (`/package`)
Priority: MEDIUM
Goal: Drive upgrades

Sections:
1. Current package badge
2. Upgrade options (3 tiers)
3. Comparison table
4. Benefits of each tier

### P2P (`/p2p`)
Priority: MEDIUM
Goal: Internal transfers

Sections:
1. Send/Receive tabs
2. User search
3. Amount input
4. History

### Support (`/support`)
Priority: LOW
Goal: Resolve issues

Sections:
1. Raise ticket form
2. My tickets list
3. Ticket status tracker

### Profile (`/profile`)
Priority: LOW
Goal: Account management

Sections:
1. Profile info
2. Edit form
3. Security settings
4. Referral settings

---

## 8. Gamification Elements

### Daily Streak
- Calendar visualization showing login days
- Streak counter with flame icon
- Reward preview for streak milestones

### Rank Badges
- Animated badge reveal on rank-up
- Glow effect for current rank
- Progress indicator to next rank

### Achievement Cards
- Unlockable badges
- Progress toward achievements
- Celebration animation on unlock

### Growth Indicators
- Up arrows for positive metrics
- Animated number counters
- Pulsing glow on earnings updates

---

## 9. API Integration Suggestions

### Endpoints to Build

```typescript
// Dashboard
GET /api/dashboard          // Main dashboard data
GET /api/earnings/chart     // Chart data with date range
GET /api/activity/recent    // Recent activity feed

// User
GET /api/user/profile
PUT /api/user/profile
GET /api/user/referral-code

// Team
GET /api/team               // Team overview
GET /api/team/left          // Left leg members
GET /api/team/right         // Right leg members
GET /api/team/tree          // Binary tree structure

// Income
GET /api/income             // All income types
GET /api/income/direct      // Direct commissions
GET /api/income/binary      // Binary commissions
GET /api/income/level       // Level income

// Wallet
GET /api/wallet/balance
GET /api/wallet/transactions

// Withdrawal
POST /api/withdrawal/request
GET /api/withdrawal/history

// Package
GET /api/package/current
GET /api/package/available
POST /api/package/upgrade

// P2P
POST /api/p2p/transfer
GET /api/p2p/history
GET /api/user/search        // For P2P

// Support
POST /api/support/ticket
GET /api/support/tickets
GET /api/support/ticket/:id
```

### Response Shapes

```typescript
// Dashboard Response
interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    rank: string;
    package: string;
  };
  earnings: {
    total: number;
    today: number;
    weekly: number;
    monthly: number;
  };
  wallets: {
    secureCoin: number;
    commission: number;
    withdrawable: number;
  };
  binary: {
    leftCount: number;
    rightCount: number;
    leftVolume: number;
    rightVolume: number;
  };
  chartData: ChartPoint[];
  recentActivity: Activity[];
}
```

---

## 10. Mobile Responsiveness

### Sidebar Behavior
- Mobile: Bottom tab navigation
- Tablet: Collapsible sidebar
- Desktop: Full sidebar

### Card Grids
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3-4 columns

### Tables
- Mobile: Horizontal scroll
- Desktop: Full width with sort

### Charts
- Mobile: Simplified view
- Desktop: Full interactive

---

## 11. Accessibility

- Proper ARIA labels
- Keyboard navigation
- Focus indicators
- Color contrast WCAG AA
- Screen reader friendly

---

## 12. Performance

- Lazy load pages
- Skeleton loaders
- Optimistic UI updates
- Image optimization
- Code splitting per route
