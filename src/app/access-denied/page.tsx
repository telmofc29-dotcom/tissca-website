import Link from 'next/link';

export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b141b] via-[#101c26] to-[#0b141b] text-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#CBB26B]/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#2d4152]/35 blur-3xl" />
      </div>

      <section className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_70px_rgba(0,0,0,0.55)] p-8 md:p-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#f3e3b2]">
          Access denied
        </h1>
        <p className="mt-3 text-white/80 leading-relaxed">
          You don&apos;t have permission to view this page. Please log in with an account that has access.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full px-5 py-2.5 font-semibold bg-[#CBB26B] text-[#0b141b] hover:bg-[#d8c388] transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full px-5 py-2.5 font-semibold border border-white/20 text-white hover:bg-white/10 transition-colors"
          >
            Back to site
          </Link>
        </div>
      </section>
    </main>
  );
}
