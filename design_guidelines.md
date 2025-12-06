# Design Guidelines: Document & Data Tools (AI Powered) B2B SaaS Platform

## Design Approach

**System-Based Approach** drawing from Linear's clean efficiency, Stripe's professional polish, and Notion's intuitive hierarchy. This B2B productivity platform prioritizes clarity, efficiency, and trust over visual flair.

**Key Principles:**
- Information clarity over decoration
- Consistent patterns for predictable workflows
- Professional polish that builds enterprise trust
- Efficient layouts that minimize clicks and cognitive load

---

## Typography System

**Font Stack:** Inter (primary), SF Mono (code/data)

**Hierarchy:**
- Page Headers: text-4xl font-bold tracking-tight
- Section Headers: text-2xl font-semibold
- Card Titles: text-lg font-semibold
- Body Text: text-base font-normal leading-relaxed
- Helper Text: text-sm text-muted
- Data/Metrics: text-3xl font-bold tabular-nums
- Code/Technical: font-mono text-sm

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-6
- Card spacing: p-8
- Section gaps: gap-8
- Page margins: px-8 py-12
- Tight groupings: gap-2
- Loose sections: gap-16

**Container Strategy:**
- Dashboard layouts: max-w-7xl mx-auto
- Tool pages: max-w-6xl mx-auto
- Forms: max-w-2xl mx-auto
- Settings pages: max-w-4xl mx-auto

---

## Core Components

### Dashboard Layout
- Sidebar navigation (w-64, fixed) with collapsible sections
- Main content area with breadcrumbs and page header
- Stats cards in grid-cols-1 md:grid-cols-3 lg:grid-cols-4 layout
- Metric cards: rounded-xl border p-6 with large number + label + trend indicator
- Activity feed in chronological list with timestamps and icons

### Tool Interface
- Two-column layout: File upload zone (left, w-1/2) + Options panel (right, w-1/2)
- Drag-and-drop upload area: min-h-96 border-2 border-dashed rounded-xl with centered icon and text
- File list with thumbnail + name + size + remove button
- Action buttons sticky at bottom or in top-right toolbar
- Progress indicators with percentage and estimated time

### Navigation
- Top navbar: Logo left, main nav center, user menu right (h-16)
- Sidebar for dashboard: Logo + nav items with icons + badge counts
- Breadcrumb trail: Home > Tools > PDF Merge with separators
- Tab navigation for multi-section pages

### Forms & Inputs
- Label above input: text-sm font-medium mb-2
- Input fields: h-11 px-4 rounded-lg border with focus ring
- Dropdown selects: Custom styled with chevron icon
- Checkboxes and radios: Larger touch targets (w-5 h-5)
- File upload buttons: Full-width dashed border zones with icon + text
- Form sections grouped with subtle dividers, gap-6 between fields

### Data Tables
- Striped rows for readability
- Sticky header with sortable columns
- Action buttons in rightmost column (icon buttons)
- Pagination controls at bottom-right
- Filters and search in top-left toolbar
- Responsive: Stack to cards on mobile

### Cards & Containers
- Tool cards: rounded-xl border p-6 with icon + title + description + CTA button
- Feature cards: Grid layout (grid-cols-3) with large icon, title, 2-line description
- Stat cards: Large number + small label + optional chart sparkline
- Content cards: rounded-lg shadow-sm p-6

### Modals & Overlays
- Modal backdrop: Dimmed overlay with centered content
- Modal container: max-w-2xl rounded-xl p-8 shadow-2xl
- Modal header: Title + close button (top-right)
- Modal footer: Actions right-aligned with gap-3

### Buttons
- Primary: h-11 px-6 rounded-lg font-medium (filled)
- Secondary: h-11 px-6 rounded-lg font-medium border
- Ghost: h-11 px-6 rounded-lg font-medium (transparent)
- Icon-only: w-11 h-11 rounded-lg
- Button groups: Segmented controls with rounded-lg borders

### Admin Panel Specifics
- Charts: Line charts for usage trends, bar charts for comparisons, donut charts for distribution
- User table: Avatar + name + email + plan + status + actions
- Filters sidebar (w-72) with category sections
- Export and bulk action toolbars above tables

### Pricing Page
- Three-column comparison: grid-cols-1 md:grid-cols-3
- Highlighted "Popular" plan with border accent and slight elevation
- Feature list with checkmarks, bullets for included features
- Large pricing number with /month denomination
- CTA buttons: Full-width within each column
- Feature comparison table below tier cards

---

## Page Templates

### Landing/Marketing Pages
- Hero: Full-width section with two-column layout (text left, app screenshot/demo right), h-screen or min-h-[600px]
- Feature showcase: Three-column grid with icons, titles, descriptions
- Social proof: Logos in auto-scroll marquee or static grid
- CTA sections: Centered text + button with generous py-24 spacing
- Footer: Four-column layout (product, company, resources, legal) with newsletter signup

### Dashboard Home
- Welcome header with user name and quick stats (2-row layout)
- Recent activity feed (left, w-2/3) + quick actions sidebar (right, w-1/3)
- Usage charts in grid-cols-2 below
- File history table at bottom

### Tool Pages
- Tool header: Icon + title + short description, aligned left
- Upload zone: Centered, prominent with drag-drop functionality
- Options panel: Collapsible sections with clear labels
- Convert/Process button: Fixed at bottom or sticky toolbar
- Results area: Download cards with preview thumbnails

### Settings Pages
- Sidebar navigation (w-64) with setting categories
- Content area with section headers and form fields
- Save/Cancel buttons sticky at bottom-right

---

## Special Patterns

**AI Credit Display:** Circular progress ring showing credits used/remaining with number in center

**File Processing Status:** Linear progress bar with percentage + cancel button + file name

**Subscription Badge:** Pill-shaped badge (Free/Pro/Enterprise) with appropriate styling next to username

**Empty States:** Centered icon + heading + description + action button in subtle container

**Loading States:** Skeleton loaders matching content structure, shimmer animation

**Toast Notifications:** Top-right corner, slide-in animation, auto-dismiss after 5s

---

## Images

**Hero Section:** Large screenshot/mockup of the dashboard interface showing document processing in action (right side of two-column hero). The image should show the clean UI with file uploads, processing status, and results. Place in rounded-xl container with subtle shadow.

**Feature Sections:** Use SVG illustrations for AI features, document icons, and security badges. Keep illustrations simple and on-brand.

**Tool Pages:** Thumbnail previews of processed files in results area.

**Admin Dashboard:** Chart visualizations and data graphs (use charting library).

**No decorative background images** - maintain professional, data-focused aesthetic throughout.