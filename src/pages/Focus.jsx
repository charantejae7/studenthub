import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

const MODES = [
  {
    id: "25-5",
    label: "25 / 5",
    name: "Classic",
    focus: 25,
    break: 5,
  },
  {
    id: "50-10",
    label: "50 / 10",
    name: "Deep Work",
    focus: 50,
    break: 10,
  },
  {
    id: "90-15",
    label: "90 / 15",
    name: "Long Session",
    focus: 90,
    break: 15,
  },
]

function getTodayKey() {
  const now = new Date()

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function formatTimer(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`
}

function Focus() {
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])

  const [selectedTaskId, setSelectedTaskId] = useState("")
  const [modeId, setModeId] = useState("25-5")

  const [phase, setPhase] = useState("focus")
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)

  const [sessionsToday, setSessionsToday] = useState(0)
  const [minutesToday, setMinutesToday] = useState(0)

  const [loading, setLoading] = useState(true)
  const [updatingTask, setUpdatingTask] = useState(false)
  const [error, setError] = useState("")

  const selectedMode =
    MODES.find((mode) => mode.id === modeId) || MODES[0]

  const selectedTask = useMemo(
    () =>
      tasks.find((task) => task.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  )

  const totalSeconds =
    phase === "focus"
      ? selectedMode.focus * 60
      : selectedMode.break * 60

  const progress =
    totalSeconds > 0
      ? ((totalSeconds - secondsLeft) / totalSeconds) * 100
      : 0

  useEffect(() => {
    const loadFocusData = async () => {
      setLoading(true)
      setError("")

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        setLoading(false)
        return
      }

      setUser(currentUser)

      const { data, error: taskError } = await supabase
        .from("study_tasks")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("completed", false)
        .order("task_date", { ascending: true })
        .order("start_time", { ascending: true })
        .order("created_at", { ascending: true })

      if (taskError) {
        console.error(taskError)
        setError("Unable to load your study tasks.")
      } else {
        const loadedTasks = data || []

        setTasks(loadedTasks)

        if (loadedTasks.length > 0) {
          setSelectedTaskId(loadedTasks[0].id)
        }
      }

      const statsKey =
        `studenthub_focus_stats_${currentUser.id}`

      const savedStats = JSON.parse(
        localStorage.getItem(statsKey) || "{}"
      )

      const todayStats = savedStats[getTodayKey()] || {}

      setSessionsToday(todayStats.sessions || 0)
      setMinutesToday(todayStats.minutes || 0)

      setLoading(false)
    }

    loadFocusData()
  }, [])

  useEffect(() => {
    if (!running) return

    const interval = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [running])

  useEffect(() => {
    if (!running || secondsLeft !== 0) return

    setRunning(false)

    if (phase === "focus") {
      const newSessions = sessionsToday + 1
      const newMinutes =
        minutesToday + selectedMode.focus

      setSessionsToday(newSessions)
      setMinutesToday(newMinutes)

      if (user) {
        const statsKey =
          `studenthub_focus_stats_${user.id}`

        const savedStats = JSON.parse(
          localStorage.getItem(statsKey) || "{}"
        )

        savedStats[getTodayKey()] = {
          sessions: newSessions,
          minutes: newMinutes,
        }

        localStorage.setItem(
          statsKey,
          JSON.stringify(savedStats)
        )
      }

      setPhase("break")
      setSecondsLeft(selectedMode.break * 60)

      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification("Focus complete 🎉", {
          body: "Your focus session is finished. Take a break.",
        })
      }
    } else {
      setPhase("focus")
      setSecondsLeft(selectedMode.focus * 60)

      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification("Break finished ⚡", {
          body: "Ready to focus again?",
        })
      }
    }
  }, [
    running,
    secondsLeft,
    phase,
    sessionsToday,
    minutesToday,
    selectedMode,
    user,
  ])

  useEffect(() => {
    document.title = running
      ? `${formatTimer(secondsLeft)} · Focus`
      : "StudentHub Focus"

    return () => {
      document.title = "StudentHub"
    }
  }, [running, secondsLeft])

  const selectMode = (mode) => {
    setRunning(false)
    setModeId(mode.id)
    setPhase("focus")
    setSecondsLeft(mode.focus * 60)
  }

  const startTimer = async () => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      try {
        await Notification.requestPermission()
      } catch {
        // Ignore notification permission errors.
      }
    }

    setRunning(true)
  }

  const pauseTimer = () => {
    setRunning(false)
  }

  const resetTimer = () => {
    setRunning(false)
    setPhase("focus")
    setSecondsLeft(selectedMode.focus * 60)
  }

  const skipTimer = () => {
    setRunning(false)

    if (phase === "focus") {
      setPhase("break")
      setSecondsLeft(selectedMode.break * 60)
    } else {
      setPhase("focus")
      setSecondsLeft(selectedMode.focus * 60)
    }
  }

  const completeTask = async () => {
    if (!selectedTask || !user) return

    setUpdatingTask(true)
    setError("")

    const { error: updateError } = await supabase
      .from("study_tasks")
      .update({
        completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedTask.id)
      .eq("user_id", user.id)

    if (updateError) {
      console.error(updateError)

      setError("Unable to mark this task as completed.")
      setUpdatingTask(false)
      return
    }

    const remainingTasks = tasks.filter(
      (task) => task.id !== selectedTask.id
    )

    setTasks(remainingTasks)
    setSelectedTaskId(remainingTasks[0]?.id || "")

    setUpdatingTask(false)
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050507] text-white">
        <div className="text-center">
          <div className="text-5xl">◉</div>

          <p className="mt-4 text-sm text-zinc-500">
            Starting Focus Mode...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050507] text-white">
      {/* Ambient background */}

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-fuchsia-500/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-10">
        {/* Minimal top bar */}

        <header className="flex items-center justify-between border-b border-white/5 pb-5">
          <Link
            to="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 font-black">
              S
            </div>

            <div>
              <p className="font-black tracking-tight">
                StudentHub
              </p>

              <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">
                Focus
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/schedule"
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              ← Schedule
            </Link>
          </div>
        </header>

        {/* Main focus area */}

        <div className="flex flex-1 items-center py-10">
          <div className="grid w-full gap-10 lg:grid-cols-[1fr_300px]">
            {/* Timer */}

            <section className="flex flex-col items-center justify-center">
              <div className="mb-6 flex items-center gap-3">
                <div
                  className={`h-2 w-2 rounded-full ${
                    phase === "focus"
                      ? "bg-violet-400"
                      : "bg-emerald-400"
                  }`}
                />

                <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
                  {phase === "focus"
                    ? "Focus Session"
                    : "Break"}
                </p>
              </div>

              {/* SVG Timer */}

              <div className="relative h-[290px] w-[290px] sm:h-[380px] sm:w-[380px]">
                <svg
                  viewBox="0 0 380 380"
                  className="h-full w-full -rotate-90"
                >
                  <circle
                    cx="190"
                    cy="190"
                    r="165"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-white/5"
                  />

                  <circle
                    cx="190"
                    cy="190"
                    r="165"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className={
                      phase === "focus"
                        ? "text-violet-400"
                        : "text-emerald-400"
                    }
                    strokeDasharray={2 * Math.PI * 165}
                    strokeDashoffset={
                      2 *
                      Math.PI *
                      165 *
                      (1 - progress / 100)
                    }
                    style={{
                      transition:
                        "stroke-dashoffset 0.5s linear",
                    }}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-bold uppercase tracking-[0.35em] text-zinc-600">
                    {selectedMode.name}
                  </span>

                  <span className="mt-2 text-6xl font-black tracking-tight sm:text-8xl">
                    {formatTimer(secondsLeft)}
                  </span>

                  <span className="mt-3 text-sm text-zinc-500">
                    {phase === "focus"
                      ? "Stay locked in."
                      : "Recharge."}
                  </span>
                </div>
              </div>

              {/* Controls */}

              <div className="mt-8 flex items-center gap-3">
                <button
                  onClick={resetTimer}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  title="Reset"
                >
                  ↺
                </button>

                <button
                  onClick={
                    running ? pauseTimer : startTimer
                  }
                  className={`flex h-16 min-w-[150px] items-center justify-center rounded-full px-8 text-base font-black transition ${
                    phase === "focus"
                      ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400"
                      : "bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/10 hover:bg-emerald-400"
                  }`}
                >
                  {running ? "⏸ Pause" : "▶ Start"}
                </button>

                <button
                  onClick={skipTimer}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  title="Skip"
                >
                  ⏭
                </button>
              </div>

              {/* Modes */}

              <div className="mt-8 flex flex-wrap justify-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-2">
                {MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => selectMode(mode)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                      mode.id === modeId
                        ? "bg-white/10 text-white"
                        : "text-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Right side */}

            <aside className="flex flex-col justify-center gap-4">
              {/* Current task */}

              <div className="rounded-3xl border border-white/5 bg-white/[0.025] p-5 backdrop-blur-xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
                  Studying now
                </p>

                {tasks.length === 0 ? (
                  <div className="mt-5">
                    <div className="text-3xl">✓</div>

                    <p className="mt-3 font-bold">
                      All tasks completed
                    </p>

                    <p className="mt-2 text-xs leading-5 text-zinc-600">
                      Your planner has no unfinished tasks.
                    </p>

                    <Link
                      to="/planner"
                      className="mt-4 inline-block text-xs font-bold text-violet-400 hover:text-violet-300"
                    >
                      Create another plan →
                    </Link>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedTaskId}
                      onChange={(event) =>
                        setSelectedTaskId(
                          event.target.value
                        )
                      }
                      className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-zinc-300 outline-none focus:border-violet-400"
                    >
                      {tasks.map((task) => (
                        <option
                          key={task.id}
                          value={task.id}
                        >
                          {task.task_title}
                        </option>
                      ))}
                    </select>

                    {selectedTask && (
                      <>
                        <h2 className="mt-5 text-xl font-black leading-tight">
                          {selectedTask.task_title}
                        </h2>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-violet-500/10 px-3 py-1 text-[10px] font-bold text-violet-300">
                            {selectedTask.subject}
                          </span>

                          <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold text-zinc-500">
                            {selectedTask.priority}
                          </span>
                        </div>

                        <p className="mt-4 text-xs leading-5 text-zinc-600">
                          {selectedTask.duration_minutes} minutes planned
                        </p>

                        <button
                          onClick={completeTask}
                          disabled={updatingTask}
                          className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-3 text-xs font-black text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-40"
                        >
                          {updatingTask
                            ? "Saving..."
                            : "✓ Finish Task"}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Stats */}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-white/5 bg-white/[0.025] p-5">
                  <p className="text-2xl font-black">
                    {sessionsToday}
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                    Sessions
                  </p>
                </div>

                <div className="rounded-3xl border border-white/5 bg-white/[0.025] p-5">
                  <p className="text-2xl font-black">
                    {minutesToday}
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                    Minutes
                  </p>
                </div>
              </div>

              {/* Focus rule */}

              <div className="rounded-3xl border border-white/5 bg-white/[0.015] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-700">
                  Focus rule
                </p>

                <p className="mt-3 text-sm font-semibold leading-6 text-zinc-500">
                  One task. One session. No distractions.
                </p>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-300">
                  {error}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Focus