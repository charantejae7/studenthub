import { Link } from "react-router-dom"

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute left-1/2 top-10 -z-0 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-16 text-center">
        
        {/* Badge */}
        <div className="mb-6 inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
          ✦ Built for students who actually have exams 😭
        </div>

        {/* Heading */}
        <h1 className="text-5xl font-black tracking-tight sm:text-6xl md:text-7xl">
          Your exam.
          <br />

          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            Your plan.
          </span>

          <br />

          No panic.
        </h1>

        {/* Description */}
        <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
          Find your study resources, plan your preparation,
          and survive those last-minute exam situations.
        </p>

        {/* Buttons */}
        <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">

          {/* PLAN MY EXAM */}
          <Link
            to="/planner"
            className="rounded-full bg-white px-7 py-3 font-semibold text-black transition duration-300 hover:scale-105 hover:bg-zinc-200"
          >
            ⚡ Plan My Exam
          </Link>

          {/* EXPLORE RESOURCES */}
          <Link
            to="/resources"
            className="rounded-full border border-zinc-700 px-7 py-3 font-semibold text-white transition duration-300 hover:border-zinc-500 hover:bg-zinc-900"
          >
            📚 Explore Resources
          </Link>

        </div>

        {/* Small trust/info row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-zinc-600">
          <span>✓ Smart study planning</span>
          <span>✓ Shared resources</span>
          <span>✓ Live exam countdown</span>
        </div>
      </div>
    </section>
  )
}

export default Hero