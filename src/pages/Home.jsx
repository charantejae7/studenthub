import { Link } from "react-router-dom"
import Hero from "../components/Hero"
import FeatureCard from "../components/FeatureCard"

function Home() {
  return (
    <main className="min-h-[calc(100vh-80px)] bg-zinc-950 text-white">
      <Hero />

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-400">
            Everything students need
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            One place for your entire semester.
          </h2>

          <p className="mt-4 leading-7 text-zinc-500">
            Plan exams, organize study resources, follow your timetable
            and stay focused without jumping between different apps.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon="📝"
            title="Smart Exam Planner"
            description="Turn your upcoming exams and topics into a structured study plan."
            accent="violet"
          />

          <FeatureCard
            icon="📚"
            title="College Resources"
            description="Store and access notes, question papers, lab manuals and other study material."
            accent="pink"
          />

          <FeatureCard
            icon="📅"
            title="Study Schedule"
            description="See exactly what you need to study on each day of your semester."
            accent="violet"
          />

          <FeatureCard
            icon="🚨"
            title="Panic Mode"
            description="Running out of time? Get an emergency revision plan based on your exam."
            accent="pink"
          />

          <FeatureCard
            icon="⏱️"
            title="Focus Mode"
            description="Start a focused study session and work through your planned tasks."
            accent="violet"
          />

          <FeatureCard
            icon="📊"
            title="Progress Tracking"
            description="Track completed sessions, study time and your overall academic activity."
            accent="pink"
          />
        </div>
      </section>

      <section className="border-t border-zinc-900">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <div className="rounded-[2rem] border border-violet-500/20 bg-violet-500/5 p-8 sm:p-12">
            <div className="text-5xl">🎓</div>

            <h2 className="mt-5 text-3xl font-black">
              Stop studying randomly.
            </h2>

            <p className="mx-auto mt-4 max-w-xl leading-7 text-zinc-400">
              StudentHub helps you know what to study, when to study
              and how much you've already completed.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/planner"
                className="rounded-2xl bg-violet-500 px-6 py-3 font-bold text-white transition hover:bg-violet-400"
              >
                Create Study Plan
              </Link>

              <Link
                to="/resources"
                className="rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-3 font-bold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
              >
                Explore Resources
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Home