# BUILDR - Quick Reference Guide

## Most Important Files

### 🎨 Brand Configuration (CHANGE THIS FIRST)
```
src/config/brand.ts
```
Everything branding, navigation, colors, contact info.
**One file to rebrand the entire platform.**

### 📄 Global Layout (All pages inherit this)
```
src/app/layout.tsx
```
Header, footer, metadata. Wraps every page.

### 🏠 Homepage
```
src/app/page.tsx
```
Hero section + 6 main sections

### 📚 All Section Pages
```
src/app/workmanship/page.tsx
src/app/construction-costs/page.tsx
src/app/avoid-scams/page.tsx
src/app/calculators/page.tsx
src/app/guides/page.tsx
src/app/education/page.tsx
```

---

## Common Commands

```bash
# Start developing
npm run dev
# → http://localhost:3000

# Build for production
npm run build

# Run production server
npm start

# Check for errors
npm run lint
```

---

## Adding Content

### New Guide Page
1. Create file: `src/app/guides/[slug]/page.tsx`
2. Use this template:

```typescript
import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';

export const metadata: Metadata = {
  title: 'Your Guide Title',
  description: 'Brief description for SEO',
};

export default function GuidePage() {
  return (
    <ContentPageLayout
      title="Your Guide Title"
      description="Longer description shown on page"
      slug="your-slug"
    >
      {/* Your content here */}
      <h2>Section Title</h2>
      <p>Paragraph text</p>
      <ul>
        <li>Bullet point</li>
      </ul>
    </ContentPageLayout>
  );
}
```

3. Link to it:
```tsx
<a href="/guides/your-slug">Your Guide</a>
```

---

## Changing Colors

Edit `src/config/brand.ts`:

```typescript
colors: {
  primary: '#1f2937',      // Dark headers
  secondary: '#374151',    // Text
  accent: '#3b82f6',       // Links, buttons
  success: '#10b981',      // Success states
  warning: '#f59e0b',      // Warnings
  error: '#ef4444',        // Errors
},
```

All pages update instantly. ✨

---

## Changing Company Name

Edit `src/config/brand.ts`:

```typescript
name: 'BUILDR',           // Short name
displayName: 'BUILDR',    // Display name
tagline: 'Your tagline',  // Subtitle
```

All pages update instantly. ✨

---

## Changing Navigation

Edit `src/config/brand.ts`:

```typescript
navigation: {
  main: [
    { label: 'Home', href: '/' },
    { label: 'Your Link', href: '/your-page' },
    // ...
  ],
},
```

Header and footer update instantly. ✨

---

## Creating New Calculators

1. Create directory: `src/app/calculators/[name]/`
2. Create `page.tsx`:

```typescript
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Calculator',
  description: 'What this calculates',
};

export default function CalculatorPage() {
  return (
    <>
      <section className="bg-secondary text-white py-12 md:py-16">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <h1 className="text-4xl font-bold mb-4">Your Calculator</h1>
          <p className="text-lg text-gray-200">Description</p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          {/* Your calculator UI */}
        </div>
      </section>
    </>
  );
}
```

3. Add to calculator directory on `/calculators`

---

## Creating New Sections

### If it's a main section with subsections:

1. Create directory: `src/app/new-section/`
2. Create `page.tsx` (overview page)
3. Create `src/app/new-section/[slug]/page.tsx` (for individual pages)
4. Update `src/config/brand.ts` navigation

### If it's just one page:

1. Create directory: `src/app/new-page/`
2. Create `page.tsx` with your content
3. Update navigation if needed

---

## Image Guidelines

### Save images in:
```
public/images/[section]/[type]/image-name.jpg
```

Examples:
```
public/images/guides/tiling/bathroom-setup.jpg
public/images/calculators/tiling/examples.jpg
public/images/defects/cracked-tiles.jpg
```

### Use in pages:
```typescript
import Image from 'next/image';

export default function Page() {
  return (
    <Image
      src="/images/guides/tiling/bathroom-setup.jpg"
      alt="Bathroom tiling setup"
      width={800}
      height={600}
    />
  );
}
```

### Guidelines:
- Optimize images before adding
- Use JPEG for photos, PNG for graphics
- Max width: 1200px
- Always include alt text

---

## SEO Checklist (Per Page)

Every page should have:

```typescript
export const metadata: Metadata = {
  title: 'Page Title (50-60 chars)',
  description: 'Page description (150-160 chars)',
};
```

✓ Unique title
✓ Unique description
✓ Proper H1 tag
✓ Internal links to related pages
✓ Good heading hierarchy (H1→H2→H3)

---

## Tailwind CSS Classes

Common classes used:

```html
<!-- Text Colors -->
<p className="text-primary">Dark text</p>
<p className="text-secondary">Gray text</p>
<p className="text-accent">Blue text</p>

<!-- Backgrounds -->
<div className="bg-light">Light background</div>
<div className="bg-primary text-white">Dark bg</div>

<!-- Spacing -->
<div className="py-12 md:py-16">Vertical padding</div>
<div className="px-4 md:px-8">Horizontal padding</div>

<!-- Layout -->
<div className="max-w-[1200px] mx-auto">Centered container</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-8">2-column grid</div>

<!-- Typography -->
<h1 className="text-4xl font-bold">Large heading</h1>
<p className="text-lg leading-relaxed">Large text</p>

<!-- Responsive -->
<div className="hidden md:block">Show on desktop only</div>
<div className="md:hidden">Show on mobile only</div>
```

---

## Deployment (Quick Start)

### To Vercel (Easiest)
```bash
npm i -g vercel
vercel
```

Then follow the prompts.

### To Node.js Server
```bash
npm run build
npm start
# → http://localhost:3000
```

See DEPLOYMENT.md for full instructions.

---

## Useful Links

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Docs](https://react.dev)

---

## File Structure (Essential Files)

```
src/
├── app/
│   ├── layout.tsx           ← Global layout (header/footer)
│   ├── page.tsx             ← Homepage
│   ├── globals.css          ← Global styles
│   └── [section]/page.tsx   ← Section pages
│
├── components/
│   ├── GlobalHeader.tsx     ← Navigation
│   ├── GlobalFooter.tsx     ← Footer
│   └── ContentPageLayout.tsx ← Content template
│
└── config/
    └── brand.ts             ← EVERYTHING BRANDING
```

---

## Common Issues

### Port 3000 already in use?
```bash
npm run dev -- -p 3001
```

### Build fails?
```bash
rm -rf .next
npm run build
```

### ESLint warnings?
They're fine, non-blocking. See `.eslintrc.json` to customize rules.

### Changes not showing?
```bash
# 1. Save the file
# 2. Check terminal for errors
# 3. Hard refresh browser (Ctrl+Shift+R)
```

---

## Key Concepts

### Brand-Agnostic
Everything references `brandConfig` in `src/config/brand.ts`.
Change branding in ONE place, updates everywhere.

### Dynamic Routes
```
/guides/[slug]          → /guides/how-to-tile, /guides/painting-tips, etc.
/workmanship/[slug]     → /workmanship/cracked-tiles, etc.
```
Unlimited pages with one route file.

### Content Layout
All content pages use `ContentPageLayout` component.
Ensures consistent styling and structure.

### SEO Ready
Every page has metadata, schema.org data, and proper HTML structure.
Ready for search engines.

---

## Getting Help

1. **Check ARCHITECTURE.md** - Detailed routing and scaling
2. **Check README.md** - Getting started guide
3. **Check DEPLOYMENT.md** - Hosting instructions
4. **Check CHECKLIST.md** - What to build next
5. **Look at existing pages** - Copy structure from them

---

## Next Action Items

1. [ ] Customize `brand.ts`
2. [ ] Add logo to `/public/`
3. [ ] Run `npm run dev` and verify homepage
4. [ ] Create first guide page
5. [ ] Deploy to Vercel or hosting

---

**You have everything you need. Start building! 🚀**
