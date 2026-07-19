# Complaint Management Dashboard Design System

## Global Styles

### Colors
- **Primary:** `#4F46E5` (Indigo 600) - Used for primary actions, active states, and key highlights.
- **Secondary:** `#10B981` (Emerald 500) - Used for success states and positive trends.
- **Background:** `#F9FAFB` (Gray 50) - Main application background.
- **Surface:** `#FFFFFF` (White) - Card and container backgrounds.
- **Text Primary:** `#111827` (Gray 900) - Headings and primary text.
- **Text Secondary:** `#6B7280` (Gray 500) - Subtitles and supplementary text.
- **Error:** `#EF4444` (Red 500) - Critical alerts and high-priority complaints.
- **Warning:** `#F59E0B` (Amber 500) - Medium-priority complaints and warnings.
- **Info:** `#3B82F6` (Blue 500) - Low-priority complaints and general information.
- **Border:** `#E5E7EB` (Gray 200) - Dividers and subtle borders.

### Typography
- **Font Family:** 'Inter', sans-serif
- **H1:** 24px, Semi-Bold, Text Primary
- **H2:** 20px, Semi-Bold, Text Primary
- **H3:** 18px, Medium, Text Primary
- **Body:** 14px, Regular, Text Primary
- **Small:** 12px, Regular, Text Secondary

### Spacing & Layout
- **Base Unit:** 4px
- **Padding/Margin:** 16px (standard), 24px (large), 8px (small)
- **Border Radius:** 8px (standard), 12px (large for cards)
- **Shadows:** 
  - `sm`: 0 1px 2px 0 rgba(0, 0, 0, 0.05) (cards)
  - `md`: 0 4px 6px -1px rgba(0, 0, 0, 0.1) (dropdowns/modals)

---

## Core Components

### 1. Sidebar Navigation
- **Container:** Width 256px, Surface color, full height, right border (Border color).
- **Logo Area:** 64px height, bottom border (Border color), contains App Logo and "ResolveCMS".
- **Nav Links:** 
  - Default: Text Secondary, Transparent background.
  - Hover: Background `#F3F4F6` (Gray 100), Text Primary.
  - Active: Background `#EEF2FF` (Indigo 50), Text `#4F46E5`, left border accent 4px `#4F46E5`.
- **Icons:** 20x20px, aligned left of text.

### 2. Header
- **Container:** Height 64px, Surface color, bottom border (Border color).
- **Content:** Global search bar (left), Notification bell with unread badge (right), User Avatar & Dropdown (right).

### 3. KPI Cards (Stat Cards)
- **Container:** Surface color, Border Radius 12px, Shadow `sm`, Padding 24px.
- **Content:** 
  - Title (Text Secondary, Small).
  - Value (H1, Text Primary).
  - Trend Indicator (Small, Secondary color for positive, Error color for negative, e.g., "↑ 12% from last month").
  - Icon in top-right corner with a soft background matching the status color.

### 4. Status Badges
- **Open / Pending:** Warning Background (`#FEF3C7`), Warning Text (`#D97706`).
- **In Progress:** Info Background (`#DBEAFE`), Info Text (`#2563EB`).
- **Resolved:** Secondary Background (`#D1FAE5`), Secondary Text (`#059669`).
- **Critical:** Error Background (`#FEE2E2`), Error Text (`#DC2626`).
- **Shape:** Border Radius 9999px (pill shape), Padding 4px 12px, Small text, Medium weight.

### 5. Data Table (Complaints List)
- **Container:** Surface color, Border Radius 12px, Shadow `sm`.
- **Header:** Background `#F9FAFB` (Gray 50), bottom border, Text Secondary, Small text, Uppercase.
- **Rows:** Bottom border (Border color). Hover state: Background `#F9FAFB`.
- **Columns:** 
  - Complaint ID (bold, Primary color link)
  - Customer Name & Avatar
  - Category
  - Status (Status Badge component)
  - Priority (High/Medium/Low icon)
  - Date Submitted
  - Actions (Three dots menu)

---

## Screen Layouts

### Dashboard Overview Screen

**Structure:**
- **Sidebar** on the left.
- **Header** on the top.
- **Main Content Area** (Background color, Padding 24px).

**Main Content Layout:**
1. **Page Title:** "Dashboard" with a "New Complaint" primary button on the far right.
2. **KPI Metrics Grid:** 4 columns.
   - Total Complaints
   - Unresolved Complaints (Critical highlighted)
   - Average Resolution Time
   - Customer Satisfaction Score
3. **Charts Section:** 2 columns.
   - Left (2/3 width): "Complaints Over Time" Line Chart (last 30 days).
   - Right (1/3 width): "Complaints by Category" Doughnut Chart.
4. **Recent Complaints Table:** Full width, showing the last 10 complaints with Status Badges and Priority indicators.

### Complaint Detail Modal/Slide-over
- **Container:** Right-aligned slide-over, Width 600px, Surface color.
- **Header:** Complaint ID, Title, Status Badge, Close button.
- **Body:**
  - Customer Details (Name, Email, Phone).
  - Complaint Description (full text).
  - Timeline of events (Submitted -> Assigned -> In Progress -> Resolved).
  - Activity / Notes feed.
- **Footer:** Action buttons ("Assign to me", "Update Status", "Add Note").
