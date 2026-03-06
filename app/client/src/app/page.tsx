import Link from "next/link";

export default function Home() {
  return (
    <div className="relative left-1/2 right-1/2 -mt-24 -mb-20 w-screen -translate-x-1/2 md:-mt-28">
      <section className="relative flex min-h-dvh items-end overflow-hidden px-5 pb-8 pt-24 sm:items-center sm:px-10 sm:pb-14 sm:pt-24 md:pt-28 lg:px-14 lg:pb-20">
        <div
          className="hero-bg-image absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/stadium-250301_akk_1546-1.jpg')" }}
        />
        <div className="hero-overlay-side absolute inset-0" />
        <div className="hero-overlay-bottom absolute inset-0" />
        <div className="absolute -left-28 bottom-0 h-64 w-64 rounded-full bg-accent/12 blur-3xl" />
        <div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-sky-400/12 blur-3xl" />

        <div className="relative mx-auto w-full max-w-6xl">
          <div className="max-w-3xl">
            {/* <p className="inline-flex rounded-full border border-accent/45 bg-accent/10 px-3 py-1 text-xs font-semibold tracking-wide text-accent-light uppercase backdrop-blur-sm">
              Data-Driven Fantasy
            </p> */}
            <h1 className="mt-4 text-3xl leading-tight font-bold text-white sm:mt-6 sm:text-5xl lg:mt-7 lg:text-6xl">
              Become an NRL Fantasy Expert
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-200 sm:mt-5 sm:text-lg lg:mt-6">
              Player stats, value metrics, break evens, and live fantasy scoring
              in one fast dashboard.
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:mt-9 sm:flex-row sm:flex-wrap sm:gap-3 lg:mt-11 lg:gap-4">
              <Link
                href="/players/search"
                className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-light sm:w-auto"
              >
                Start Player Search
              </Link>
              <Link
                href="/live"
                className="inline-flex w-full items-center justify-center rounded-lg border border-white/30 bg-black/20 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/35 sm:w-auto"
              >
                View Live Matches
              </Link>
              <Link
                href="/teams"
                className="inline-flex w-full items-center justify-center rounded-lg border border-white/30 bg-black/20 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/35 sm:w-auto"
              >
                Browse Teams
              </Link>
              <Link
                href="/byes"
                className="inline-flex w-full items-center justify-center rounded-lg border border-white/30 bg-black/20 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/35 sm:w-auto"
              >
                Plan Byes
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
