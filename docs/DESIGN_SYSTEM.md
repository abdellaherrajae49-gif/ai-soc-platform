# Design System

## Visual Identity

Style: **Modern Minimalist Enterprise** — clean, airy, professional. Not cyberpunk, not student-prototype.
Emotion: "Controlled authority" — precise, reliable, high-end.

## Colors

### Surfaces
| Token               | Value     | Usage                     |
|---------------------|-----------|---------------------------|
| Background          | `#f8fafc` | Main content area         |
| Card                | `#ffffff` | All cards/containers      |
| Sidebar             | `#1b1b2f` | Fixed left navigation     |
| Border              | `#e2e8f0` | Card/table borders        |
| Hover bg            | `#f8fafc` | Table row hover           |
| Input bg            | `#f1f5f9` | Search/input fields       |

### Text
| Token               | Value     | Usage                     |
|---------------------|-----------|---------------------------|
| Primary             | `#1b1b23` | Headings, primary text    |
| Secondary           | `#1e293b` | Table cell text           |
| Muted               | `#64748b` | Subtitles, labels         |
| Placeholder         | `#94a3b8` | Input placeholders        |
| Sidebar inactive    | `rgba(255,255,255,0.5)` | Nav items     |
| Sidebar active text | `#c7d2fe` | Active nav item           |

### Semantic
| Token       | Value     | Usage                         |
|-------------|-----------|-------------------------------|
| Primary     | `#6366f1` | Buttons, active states, bars  |
| Primary alt | `#4648d4` | Sidebar logo, deeper primary  |
| Success     | `#059669` | Health, valid status          |
| Error       | `#dc2626` | Critical, alert status        |
| Warning     | `#ea580c` | High severity                 |
| Medium      | `#ca8a04` | Medium severity               |

### Tinted Backgrounds (10% opacity)
Used for status chips, KPI icons, badges:
```css
rgba(220, 38, 38, 0.1)  /* error/critical */
rgba(5, 150, 105, 0.1)  /* success/valid */
rgba(99, 102, 241, 0.1) /* primary/indigo */
rgba(100, 116, 139, 0.1) /* neutral/gray */
```

## Typography

| Style       | Font          | Size  | Weight | Use                       |
|-------------|---------------|-------|--------|---------------------------|
| Page title  | Inter         | 36px  | 700    | Main page headings        |
| Subtitle    | Inter         | 16px  | 400    | Below titles              |
| Section     | Inter         | 11px  | 600    | Uppercase section labels  |
| Body        | Inter         | 14px  | 400    | Default text              |
| Mono        | JetBrains Mono| 12-13px| 400   | IPs, scores, node counts  |
| Label caps  | Inter         | 11px  | 600    | Uppercase, 0.05em spacing |

## Spacing

| Token      | Value | Usage                    |
|------------|-------|--------------------------|
| xs         | 4px   | Tight gaps               |
| sm         | 8px   | Small padding            |
| md         | 16px  | Default padding          |
| lg         | 24px  | Card padding, gaps       |
| xl         | 32px  | Content padding, margins |
| gutter     | 20-24px| Grid gaps               |

## Components

### Cards
- White background, `1px solid #e2e8f0`, `border-radius: 12px`
- No shadows — depth via borders only
- Hover: `border-color: #cbd5e1` (slightly darker)

### Tables
- Header: `11px` uppercase, `#64748b` text, `#f8fafc` bg
- Rows: `14px` text, `14px 20px` padding
- Row hover: `#f8fafc`
- Row borders: `1px solid #f1f5f9`

### Status Badges
- `border-radius: 4px` (rectangular) or `9999px` (pill)
- `11px` uppercase, `font-weight: 700`
- Tinted background at 10% opacity

### Buttons
- Primary: `#6366f1` bg, white text, `8px` radius
- Secondary/Outlined: transparent bg, `1px solid #e2e8f0`, dark text
- Ghost (icon): no border/bg until hover

### Progress Bars
- Track: `#f1f5f9`, `height: 4-8px`, full rounded
- Fill: `#6366f1` (primary)

### Sidebar
- Width: 280px fixed
- Background: `#1b1b2f`
- Active item: `rgba(99,102,241,0.15)` bg, `#c7d2fe` text
- Inactive: `rgba(255,255,255,0.5)` text
- Hover: `rgba(255,255,255,0.06)` bg

### Search Input
- `#f1f5f9` bg, `1px solid #e2e8f0`, `8px` radius
- Focus: indigo border + `3px` glow at 10% opacity

## Icons

Lucide React — thin-line (consistent 1.5-2px stroke). Size 18-20px for nav, 16px inline.
Always monochrome unless indicating semantic state.
