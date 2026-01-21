# BUILDR Platform Architecture & Routing Guide

## Project Overview
BUILDR is a content-heavy construction authority platform built with Next.js 14, designed to scale to thousands of pages while maintaining clean architecture and professional standards.

## Core Principles
- **Brand-agnostic**: All branding configurable from `src/config/brand.ts`
- **SEO-first**: Every page has proper metadata and structured data
- **Scalable**: Architecture supports hundreds of pages and calculators
- **Professional**: Clean code, proper accessibility, semantic HTML
- **Education-focused**: Content-first design with multimedia support

## Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with header/footer
│   ├── globals.css              # Global styles
│   ├── page.tsx                 # Homepage
│   ├── not-found.tsx            # 404 page
│   │
│   ├── workmanship/             # Is This Done Properly?
│   │   ├── page.tsx             # Main section page
│   │   └── [slug]/              # Individual defect/guide pages
│   │       └── page.tsx
│   │
│   ├── construction-costs/      # How Much Should This Cost?
│   │   ├── page.tsx
│   │   └── [trade]/             # Cost by trade (tiling, painting, etc.)
│   │       └── page.tsx
│   │
│   ├── avoid-scams/             # Avoid Scams & Costly Mistakes
│   │   ├── page.tsx
│   │   └── [topic]/             # Scam type or strategy page
│   │       └── page.tsx
│   │
│   ├── calculators/             # Pro Calculators
│   │   ├── page.tsx             # Calculator directory
│   │   ├── tiling/              # Individual calculators
│   │   ├── painting/
│   │   ├── plastering/
│   │   ├── flooring/
│   │   ├── concrete/
│   │   ├── insulation/
│   │   ├── brick-block/
│   │   ├── labour/
│   │   └── waste/
│   │
│   ├── guides/                  # How To Do It Properly
│   │   ├── page.tsx
│   │   └── [slug]/              # Individual guides
│   │       └── page.tsx
│   │
│   ├── education/               # Construction Education
│   │   ├── page.tsx
│   │   └── [topic]/             # Educational topics
│   │       └── page.tsx
│   │
│   ├── about/                   # Info pages
│   ├── privacy/
│   ├── terms/
│   └── contact/
│
├── components/
│   ├── GlobalHeader.tsx         # Sticky navigation header
│   ├── GlobalFooter.tsx         # Footer with links
│   ├── ContentPageLayout.tsx    # Reusable content page template
│   ├── Calculator.tsx           # Base calculator component (future)
│   ├── VideoEmbed.tsx           # YouTube/Vimeo embed (future)
│   ├── HighlightBox.tsx         # Call-out boxes (future)
│   └── WarningBox.tsx           # Warning/safety boxes (future)
│
├── config/
│   ├── brand.ts                 # SINGLE SOURCE: All branding
│   └── metadata.ts              # SEO metadata templates
│
└── utils/
    ├── seo.ts                   # SEO utilities
    └── validation.ts            # Input validation (calculators)
```

## Routing Structure

### Top-Level Routes (Fixed)
```
/                               → Homepage
/workmanship                    → Main section
/construction-costs             → Main section
/avoid-scams                    → Main section
/calculators                    → Calculator directory
/guides                         → How To guide directory
/education                      → Education hub
/about                          → About page
/privacy                        → Privacy policy
/terms                          → Terms of service
/contact                        → Contact page
```

### Dynamic Routes (Scalable)

#### Workmanship Section
```
/workmanship                    → Overview page
/workmanship/[defect-slug]      → Individual defect (e.g., /workmanship/cracked-tiles)
/workmanship/[trade]/[issue]    → Trade-specific issues (extensible)
```

#### Construction Costs Section
```
/construction-costs             → Overview with cost factors
/construction-costs/[trade]     → Cost breakdown by trade
                                  (e.g., /construction-costs/tiling)
```

#### Avoid Scams Section
```
/avoid-scams                    → Overview
/avoid-scams/[topic]            → Specific scam types or strategies
                                  (e.g., /avoid-scams/red-flags,
                                   /avoid-scams/contract-tricks)
```

#### Calculators Section
```
/calculators                    → Directory of all calculators
/calculators/tiling             → Tiling calculator
/calculators/painting           → Painting calculator
/calculators/plastering         → Plastering calculator
/calculators/flooring           → Flooring calculator
/calculators/concrete           → Concrete calculator
/calculators/insulation         → Insulation calculator
/calculators/brick-block        → Brick & block calculator
/calculators/labour             → Labour estimator
/calculators/waste              → Material waste estimator
```

#### Guides Section
```
/guides                         → Directory of all guides
/guides/[guide-slug]            → Individual guide with multimedia
                                  (e.g., /guides/how-to-tile-a-bathroom)
```

#### Education Section
```
/education                      → Overview
/education/[topic]              → Educational topics
                                  (e.g., /education/renovation-sequence)
```

## Future Scalability

### Ready for:
- **1000+ content pages** through dynamic routes
- **Calculator variants** (e.g., /calculators/tiling/wall vs /calculators/tiling/floor)
- **User accounts** (e.g., /dashboard, /projects/[id])
- **Blog section** (/blog, /blog/[post-slug])
- **Search results** (/search?q=query)
- **Filtered content** (/guides?material=tile&skill=beginner)

### Example: Scaling Guides
```
Current: /guides/[slug]
Future:  /guides/[category]/[subcategory]/[slug]
         (e.g., /guides/flooring/wood/how-to-sand-hardwood-floors)
```

## Brand Configuration

All brand references pull from a single source: `src/config/brand.ts`

### To Rebrand the Platform:
Simply update `brand.ts`:
```typescript
export const brandConfig = {
  name: 'YOUR_BRAND_NAME',
  displayName: 'Your Brand Display',
  tagline: 'Your tagline here',
  // ... all other branding
};
```

**No component files need to be changed.**

## SEO Strategy

### Per-Page Metadata
Each page has:
- Unique `<title>` and `description`
- Open Graph tags for social sharing
- Schema.org structured data
- Canonical URLs

### URL Structure
- Clean, descriptive slugs
- Keyword-rich but readable
- Hyphenated (never underscores)
- Examples:
  - ✓ `/guides/how-to-tile-a-bathroom`
  - ✓ `/avoid-scams/builder-red-flags`
  - ✗ `/guides/guide_1` (bad)

## Content Page Template

All content pages use `ContentPageLayout` for consistency:

```tsx
<ContentPageLayout
  title="Page Title"
  description="Page description"
  slug="page-slug"
>
  {/* Your content here */}
</ContentPageLayout>
```

Features included:
- Header section with title and description
- Proper spacing and padding
- SEO-optimized structure
- Mobile responsive

## Calculator Architecture (Future)

Each calculator will:
- Be a self-contained component
- Support inputs, validation, and calculations
- Show detailed results and explanations
- Link to relevant guides
- Track (future) user history
- Export to PDF (future)

Structure:
```
src/components/calculators/
├── BaseTilingCalculator.tsx
├── BaseConcreteCalculator.tsx
└── ...

src/app/calculators/tiling/page.tsx
```

## Development Guidelines

### Adding a New Content Page
1. Create directory: `src/app/section/[slug]/`
2. Create `page.tsx` with metadata
3. Use `ContentPageLayout` component
4. Add internal links to related pages
5. Update `brand.ts` navigation if needed

### Adding a New Calculator
1. Create directory: `src/app/calculators/[calc-name]/`
2. Create calculator component
3. Create `page.tsx` that imports and displays calculator
4. Add to calculator directory on `/calculators`

### Adding a New Section
1. Create directory: `src/app/[section-name]/`
2. Create `page.tsx` (overview page)
3. Create subdirectory for nested pages if needed
4. Update navigation in `brand.ts`

## Performance Optimization

- Images optimized through Next.js `Image` component
- SEO metadata generation at build time
- Static generation for most pages
- Incremental static regeneration (ISR) for frequently updated content
- CSS-in-JS via Tailwind for critical path optimization

## Accessibility

- Semantic HTML throughout
- ARIA labels for navigation
- Proper heading hierarchy
- Keyboard navigation support
- Focus indicators
- Alt text for images (enforced)

## Testing & Deployment

- No authentication layer currently
- All pages public and indexable
- Vercel deployment ready (Next.js optimized)
- Mobile-first responsive design
- Cross-browser compatibility

---

**This architecture is designed to scale to 1000+ pages while maintaining professional standards, clean code, and exceptional user experience.**
