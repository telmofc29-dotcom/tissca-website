# TISSCA - Construction Authority Platform

A world-class, content-heavy construction education platform designed to become the global reference for construction standards, workmanship quality, cost breakdowns, and professional guidance.

## 🎯 Vision

TISSCA is not a blog or landing page. It's a long-term digital asset built to:
- Educate homeowners, tradespeople, and students
- Establish professional construction authority
- Provide honest cost and quality information
- Prevent costly mistakes and scams
- Scale to hundreds of pages over decades

## 🛠️ Tech Stack

- **Next.js 14** (App Router) - React framework with SSR/SSG
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Node.js** - Runtime environment

## 📁 Project Structure

```
buildr/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # Reusable React components
│   ├── config/           # Brand & metadata configuration
│   └── utils/            # Helper utilities
├── ARCHITECTURE.md       # Detailed routing & scaling guide
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript configuration
└── tailwind.config.ts    # Tailwind CSS configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm (or yarn/pnpm)

### Installation

```bash
# Navigate to project directory
cd c:\Projects\BUILDR

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### Development Commands

```bash
npm run dev      # Start dev server (hot reload)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## 🎨 Brand Configuration

**All branding is centralized** in a single file: `src/config/brand.ts`

To change the platform branding:
```typescript
// src/config/brand.ts
export const brandConfig = {
  name: 'YOUR_BRAND_NAME',
  displayName: 'Your Display Name',
  tagline: 'Your tagline',
  colors: { /* ... */ },
  // ... all branding
};
```

**No components need to be modified.** All references pull from this single source.

## 📄 Core Sections

### 1. **Is This Done Properly?**
   - Construction defect identification
   - Good vs bad workmanship comparison
   - Failure explanations and repair costs

### 2. **How Much Should This Cost?**
   - Honest cost breakdowns
   - Labour vs materials breakdown
   - Regional pricing factors
   - Professional vs budget comparisons

### 3. **Avoid Scams & Costly Mistakes**
   - Builder red flags
   - Contract tricks and traps
   - Fake guarantee identification
   - Protection strategies

### 4. **Pro Calculators**
   - Tiling (sqm, waste, adhesive, grout)
   - Painting (coverage, coats, litres)
   - Plastering, flooring, concrete
   - Labour estimation
   - Waste calculations

### 5. **How To Do It Properly**
   - Step-by-step guides with videos
   - Tools and materials lists
   - Common mistakes and safety notes
   - Professional tips

### 6. **Construction Education**
   - Renovation sequences
   - Material explanations
   - Professional standards
   - Best practices

## 📐 URL Structure

All routes are designed for SEO and scalability:

```
/                           → Homepage
/workmanship                → Defects & quality assessment
/construction-costs         → Cost breakdowns
/avoid-scams                → Scams & protection
/calculators                → All calculators
/guides                     → How-to guides
/education                  → Learning hub
/about, /privacy, /terms    → Info pages
```

See **ARCHITECTURE.md** for complete routing structure and future scalability.

## 🔧 Creating New Pages

### Content Page (Guides, Education, etc.)

```tsx
import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';

export const metadata: Metadata = {
  title: 'Your Page Title',
  description: 'Page description for SEO',
};

export default function YourPage() {
  return (
    <ContentPageLayout
      title="Your Page Title"
      description="Brief description"
      slug="your-slug"
    >
      {/* Your content here */}
    </ContentPageLayout>
  );
}
```

### Dynamic Routes

For scalable content sections (like guides), use dynamic routes:

```
/guides/[slug]/page.tsx
```

This supports unlimited pages (like `/guides/how-to-tile-a-bathroom`, `/guides/painting-techniques`, etc.)

## 🎯 SEO Features

- ✓ Per-page metadata (title, description, OG tags)
- ✓ Schema.org structured data
- ✓ Semantic HTML with proper heading hierarchy
- ✓ Clean, keyword-optimized URLs
- ✓ Internal linking support
- ✓ Mobile responsive design
- ✓ Fast load times (Next.js optimizations)

## 🔒 Privacy & Legal

- Privacy Policy: `/privacy`
- Terms of Service: `/terms`
- Contact: `/contact`

Full legal content to be added.

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Traditional Node.js
```bash
npm run build
npm start
```

## 📈 Future Features (Architecture Ready)

- User accounts and authentication
- Project saving and history
- PDF export for guides and calculations
- Premium membership tiers
- Photo-based defect analysis
- Ad integration
- Community features

The architecture supports these without refactoring.

## 📚 Development Guidelines

- **No hard-coded brand strings** - Use `brandConfig` from `src/config/brand.ts`
- **Semantic HTML** - Use proper heading structure, alt text, ARIA labels
- **Mobile-first** - Design for mobile, enhance for desktop
- **Professional tone** - No emojis, no hype, clear English
- **Accessibility** - WCAG 2.1 AA standard
- **SEO-ready** - Every page has metadata and structured data

## 🤝 Contributing

This is the foundation. Future contributors should:
1. Maintain the brand-agnostic approach
2. Keep code clean and maintainable
3. Follow TypeScript best practices
4. Ensure pages are SEO-optimized
5. Test on mobile and desktop
6. Write semantic, accessible HTML

## 📝 License

To be determined.

## 📞 Contact

Email: hello@tissca.com

---

**TISSCA - Building the construction authority, one guide at a time.**
