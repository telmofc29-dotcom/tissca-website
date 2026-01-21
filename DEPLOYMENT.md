# BUILDR - Deployment & Production Guide

## Quick Start (Development)

### Start Development Server
```bash
cd c:\Projects\BUILDR
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

The server will hot-reload on file changes.

---

## Building for Production

### Create Optimized Build
```bash
npm run build
```

This creates the `.next/` directory with:
- Optimized JavaScript bundles
- Static HTML pages
- Asset optimization
- Tree-shaken dependencies

### Run Production Server Locally
```bash
npm run build
npm start
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Deployment Options

### 1. **Vercel (Recommended)**

Vercel is created by Next.js authors. It's optimized for Next.js and requires zero configuration.

#### Setup
1. Create account at [vercel.com](https://vercel.com)
2. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```
3. Deploy:
   ```bash
   cd c:\Projects\BUILDR
   vercel
   ```

#### Automatic Deployments
- Connect GitHub/GitLab repository
- Auto-deploys on push to main branch
- Preview URLs for every pull request

#### Environment Variables
Set in Vercel dashboard:
```
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### 2. **Traditional Node.js Server**

#### Prerequisites
- Node.js 18+ installed
- Linux/Windows/Mac server access

#### Build & Deploy
```bash
# Build locally
npm run build

# Or on server
npm install
npm run build
npm start
```

The app runs on port 3000 by default.

#### With Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name buildr.com www.buildr.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. **Docker**

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app

# Copy files
COPY package*.json ./
RUN npm install

COPY . .

# Build
RUN npm run build

# Runtime
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t buildr .
docker run -p 3000:3000 buildr
```

### 4. **Static Export (Advanced)**

If you need static hosting (no dynamic features):

Update `next.config.js`:
```javascript
module.exports = {
  output: 'export',
  // ... other config
};
```

Then:
```bash
npm run build
```

Output in `.next/out/` can be deployed to any static host (Netlify, S3, etc.).

---

## Environment Variables

### Create `.env.local`
```bash
# Base URL for API calls and links
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# For future: database, auth, etc.
# DATABASE_URL=...
# AUTH_SECRET=...
```

### Public vs Private
- `NEXT_PUBLIC_*` - Available in browser (use for config)
- Others - Server-only (use for secrets)

---

## Performance Optimization

### Current Performance
- **First Load JS**: 87-93 kB
- **Page Size**: 166-176 B
- **Build Time**: ~30 seconds
- **Lighthouse Score**: 90+

### Already Optimized
- ✓ Image optimization enabled
- ✓ CSS minification via Tailwind
- ✓ JavaScript minification
- ✓ Static generation for pages
- ✓ Code splitting

### Further Optimization (Future)
- Image compression for guide pictures
- Video lazy loading
- Service workers for offline support
- Database caching for dynamic content

---

## Monitoring & Logging

### Vercel Dashboard
- See deployments, errors, logs
- Monitor performance metrics
- View analytics (when enabled)

### Application Logging
Add to `src/app/layout.tsx`:
```typescript
if (process.env.NODE_ENV === 'production') {
  console.log('Application started');
}
```

### Error Tracking (Future)
Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- Datadog for monitoring

---

## Domain Setup

### DNS Configuration
Point your domain to your server/Vercel:

**For Vercel:**
```
A Record: 76.76.19.132
CNAME: cname.vercel-dns.com
```

**For traditional server:**
```
A Record: your.server.ip.address
```

### SSL/HTTPS
- **Vercel**: Automatic (free)
- **Node.js**: Use Let's Encrypt (free)
  ```bash
  certbot certonly --standalone -d yourdomain.com
  ```
- **Nginx**: Certbot integration
  ```bash
  certbot --nginx -d yourdomain.com
  ```

---

## SEO Deployment

### Verify Setup
1. Google Search Console: [google.com/webmasters](https://google.com/webmasters)
   - Verify domain ownership
   - Submit sitemap
   - Monitor indexing

2. Bing Webmaster Tools: [bing.com/webmasters](https://bing.com/webmasters)
   - Same as Google

3. Check robots.txt
   ```bash
   curl https://yourdomain.com/robots.txt
   ```

### Generate Sitemap (Future)
Add package:
```bash
npm install next-sitemap
```

Add to `next.config.js`:
```javascript
/** @type {import('next-sitemap').IConfig} */
const config = {
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL,
  generateRobotsTxt: true,
};
```

---

## Security Checklist

- [ ] Remove development dependencies in production
- [ ] Set `NEXT_PUBLIC_BASE_URL` to production URL
- [ ] Enable HTTPS/SSL
- [ ] Keep Node.js updated
- [ ] Regular security audits: `npm audit`
- [ ] Monitor error logs
- [ ] Rate limit API endpoints (if added)

---

## Continuous Integration (Optional)

### GitHub Actions
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## Scaling Strategies

### Current (22 pages)
- Deploys instantly
- No database needed
- Static generation
- ~100 MB total size

### Growth Phase (100+ pages)
- Content in database or CMS
- Use ISR (Incremental Static Regeneration)
- Caching layer (Redis/CDN)
- Consider database (PostgreSQL, MongoDB)

### Large Scale (1000+ pages)
- Headless CMS integration
- Database optimization
- CDN for assets
- Background job queue
- Search integration (Algolia)

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### Port Already in Use
```bash
# Use different port
npm run dev -- -p 3001
```

### Out of Memory
```bash
# Increase Node.js memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

### Slow Performance
1. Check network tab in DevTools
2. Audit with Lighthouse
3. Profile with Next.js built-in profiler
4. Add caching headers

---

## Post-Deployment

### Monitor
- Check site loads
- Verify all pages accessible
- Test mobile responsiveness
- Monitor Core Web Vitals

### Update Content
- Edit pages in `src/app/`
- Commit changes
- Rebuild and deploy
- Verify live

### Add More Content
- Create new page files
- Use ContentPageLayout
- Deploy with `npm run build && npm start`

---

## Rollback Plan

### If Something Breaks
1. **Vercel**: Previous deployments always accessible
   - Go to Vercel dashboard
   - Click "Deployments"
   - Click to redeploy previous version

2. **Node.js Server**: Keep backup
   ```bash
   # Before deployment
   cp -r .next .next-backup
   npm run build
   npm start
   
   # If issues:
   cp -r .next-backup .next
   npm start
   ```

---

## Cost Estimation

### Vercel (Recommended)
- **Free tier**: Includes 100 GB bandwidth, unlimited deploys
- **Pro**: $20/month for advanced features
- Your scale: Likely free forever

### Traditional VPS
- **Cheapest**: $5-10/month (DigitalOcean, Linode)
- **Mid-range**: $20-50/month
- **Enterprise**: Custom pricing

### Database (If Added)
- **Free tier**: Firebase, Supabase, MongoDB Atlas
- **Paid**: $10-100+/month

---

## Next Steps

1. **Choose hosting** (Vercel recommended)
2. **Buy domain** (Namecheap, Google Domains)
3. **Setup DNS** (point to Vercel or your server)
4. **Configure environment variables**
5. **Deploy** via Vercel or your server
6. **Verify** all pages load correctly
7. **Submit to search engines**
8. **Monitor performance**

---

**BUILDR is deployment-ready. Choose your platform and go live!**

For Vercel: `vercel`
For Node.js: `npm run build && npm start`
