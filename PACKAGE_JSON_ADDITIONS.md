{
  "name": "buildr",
  "version": "0.1.0-phase-a",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "ts-node --transpile-only prisma/seed.ts"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next": "^14.2.3",
    "@supabase/supabase-js": "^2.43.0",
    "@prisma/client": "^5.12.0",
    "stripe": "^14.19.0",
    "tailwindcss": "^3.4.1",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.45",
    "prisma": "^5.12.0",
    "ts-node": "^10.9.2"
  }
}
