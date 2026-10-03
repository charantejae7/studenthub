function FeatureCard({ icon, title, description, accent = "violet" }) {
  const accentClass =
    accent === "pink"
      ? "hover:border-pink-500/50"
      : "hover:border-violet-500/50"

  return (
    <div
      className={`rounded-3xl border border-zinc-800 bg-zinc-900/60 p-7 transition duration-300 hover:-translate-y-1 ${accentClass}`}
    >
      <div className="mb-5 text-4xl">
        {icon}
      </div>

      <h2 className="text-xl font-bold">
        {title}
      </h2>

      <p className="mt-3 leading-7 text-zinc-400">
        {description}
      </p>
    </div>
  )
}

export default FeatureCard