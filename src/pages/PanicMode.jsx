import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { supabase } from "../lib/supabaseClient"

function PanicMode() {
  // =========================================
  // EXAMS
  // =========================================
  const [exams, setExams] = useState([])
  const [selectedExamId, setSelectedExamId] = useState("")
  const [loadingExams, setLoadingExams] = useState(true)

  // =========================================
  // TASKS
  // =========================================
  const [tasks, setTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  // =========================================
  // PANIC SETTINGS
  // =========================================
  const [studyHours, setStudyHours] = useState("6")
  const [preparation, setPreparation] = useState(30)

  // =========================================
  // COUNTDOWN
  // =========================================
  const [timeLeft, setTimeLeft] = useState(null)

  // =========================================
  // UI
  // =========================================
  const [error, setError] = useState("")

  // =========================================
  // LOAD UPCOMING EXAMS
  // =========================================
  useEffect(() => {
    const loadExams = async () => {
      setLoadingExams(true)
      setError("")

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError("Please log in to use Panic Mode.")
        setLoadingExams(false)
        return
      }

      const {
        data,
        error: examsError,
      } = await supabase
        .from("exams")
        .select(
          "id, subject, exam_date, exam_time"
        )
        .eq("user_id", user.id)
        .order("exam_date", {
          ascending: true,
        })
        .order("exam_time", {
          ascending: true,
        })

      if (examsError) {
        console.error(
          "Unable to load exams:",
          examsError
        )

        setError(examsError.message)
        setLoadingExams(false)
        return
      }

      const now = new Date()

      const upcoming = (data || []).filter(
        (exam) => {
          const examDateTime = new Date(
            `${exam.exam_date}T${exam.exam_time}`
          )

          return examDateTime > now
        }
      )

      setExams(upcoming)

      if (upcoming.length > 0) {
        setSelectedExamId(
          upcoming[0].id
        )
      }

      setLoadingExams(false)
    }

    loadExams()
  }, [])

  // =========================================
  // SELECTED EXAM
  // =========================================
  const selectedExam = useMemo(() => {
    return exams.find(
      (exam) =>
        exam.id === selectedExamId
    )
  }, [exams, selectedExamId])

  // =========================================
  // LOAD TASKS FOR SELECTED EXAM
  // =========================================
  useEffect(() => {
    const loadTasks = async () => {
      if (!selectedExamId) {
        setTasks([])
        return
      }

      setLoadingTasks(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setTasks([])
        setLoadingTasks(false)
        return
      }

      const {
        data,
        error: tasksError,
      } = await supabase
        .from("study_tasks")
        .select(
          "id, subject, task_title, task_date, duration_minutes, priority, completed"
        )
        .eq("user_id", user.id)
        .eq("exam_id", selectedExamId)
        .order("task_date", {
          ascending: true,
        })

      if (tasksError) {
        console.error(
          "Unable to load tasks:",
          tasksError
        )

        setError(tasksError.message)
        setTasks([])
        setLoadingTasks(false)
        return
      }

      setTasks(data || [])
      setLoadingTasks(false)
    }

    loadTasks()
  }, [selectedExamId])

  // =========================================
  // COUNTDOWN CALCULATOR
  // =========================================
  const calculateTimeLeft = () => {
    if (!selectedExam) {
      return null
    }

    const examDateTime = new Date(
      `${selectedExam.exam_date}T${selectedExam.exam_time}`
    )

    const difference =
      examDateTime.getTime() -
      new Date().getTime()

    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        expired: true,
      }
    }

    return {
      days: Math.floor(
        difference /
          (1000 * 60 * 60 * 24)
      ),
      hours: Math.floor(
        (difference /
          (1000 * 60 * 60)) %
          24
      ),
      minutes: Math.floor(
        (difference /
          (1000 * 60)) %
          60
      ),
      seconds: Math.floor(
        (difference / 1000) % 60
      ),
      expired: false,
    }
  }

  // =========================================
  // LIVE COUNTDOWN
  // =========================================
  useEffect(() => {
    setTimeLeft(
      calculateTimeLeft()
    )

    if (!selectedExam) {
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(
        calculateTimeLeft()
      )
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [selectedExam])

  // =========================================
  // FORMAT DATE
  // =========================================
  const formatDate = (
    dateString
  ) => {
    const date = new Date(
      `${dateString}T00:00:00`
    )

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    )
  }

  // =========================================
  // FORMAT TIME
  // =========================================
  const formatTime = (
    timeString
  ) => {
    if (!timeString) {
      return ""
    }

    const [hours, minutes] =
      timeString
        .slice(0, 5)
        .split(":")
        .map(Number)

    const date = new Date()

    date.setHours(
      hours,
      minutes,
      0,
      0
    )

    return date.toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    )
  }

  // =========================================
  // TODAY DATE
  // =========================================
  const getTodayString = () => {
    const today = new Date()

    const year =
      today.getFullYear()

    const month = String(
      today.getMonth() + 1
    ).padStart(2, "0")

    const day = String(
      today.getDate()
    ).padStart(2, "0")

    return `${year}-${month}-${day}`
  }

  // =========================================
  // REMAINING TASKS
  // =========================================
  const remainingTasks =
    useMemo(() => {
      return tasks.filter(
        (task) =>
          !task.completed
      )
    }, [tasks])

  // =========================================
  // COMPLETED TASKS
  // =========================================
  const completedTasks =
    tasks.filter(
      (task) =>
        task.completed
    ).length

  // =========================================
  // TOTAL REMAINING MINUTES
  // =========================================
  const remainingMinutes =
    remainingTasks.reduce(
      (total, task) =>
        total +
        Number(
          task.duration_minutes ||
            0
        ),
      0
    )

  // =========================================
  // PANIC INTENSITY
  // =========================================
  const panicLevel = useMemo(() => {
    if (!timeLeft) {
      return {
        title: "Preparing...",
        subtitle:
          "Loading your exam situation.",
        emoji: "⏳",
      }
    }

    if (
      timeLeft.days <= 1
    ) {
      return {
        title: "EXTREME PANIC",
        subtitle:
          "Forget perfection. Focus on the marks.",
        emoji: "🚨",
      }
    }

    if (
      timeLeft.days <= 3
    ) {
      return {
        title: "HIGH ALERT",
        subtitle:
          "You still have time. Use it properly.",
        emoji: "🔥",
      }
    }

    if (
      timeLeft.days <= 7
    ) {
      return {
        title: "GET SERIOUS",
        subtitle:
          "Now is the time to stop procrastinating.",
        emoji: "⚡",
      }
    }

    return {
      title: "YOU HAVE TIME",
      subtitle:
        "Build the habit before the panic starts.",
      emoji: "😌",
    }
  }, [timeLeft])

  // =========================================
  // EMERGENCY PLAN
  // =========================================
  const emergencyPlan = useMemo(() => {
    if (remainingTasks.length === 0) {
      return []
    }

    const availableMinutes =
      Math.max(
        60,
        Number(studyHours) *
          60
      )

    const preparationFactor =
      1 -
      Number(
        preparation
      ) /
        100

    const urgentMinutes =
      Math.max(
        30,
        Math.round(
          availableMinutes *
            (0.6 +
              preparationFactor *
                0.4)
        )
      )

    const sortedTasks =
      [...remainingTasks].sort(
        (a, b) => {
          const priorityWeight = {
            High: 3,
            Medium: 2,
            Low: 1,
          }

          const priorityA =
            priorityWeight[
              a.priority
            ] || 1

          const priorityB =
            priorityWeight[
              b.priority
            ] || 1

          if (
            priorityA !==
            priorityB
          ) {
            return (
              priorityB -
              priorityA
            )
          }

          return (
            Number(
              a.duration_minutes
            ) -
            Number(
              b.duration_minutes
            )
          )
        }
      )

    const result = []
    let usedMinutes = 0

    for (
      const task of sortedTasks
    ) {
      if (
        usedMinutes >=
        urgentMinutes
      ) {
        break
      }

      const originalMinutes =
        Number(
          task.duration_minutes
        )

      const remaining =
        urgentMinutes -
        usedMinutes

      const duration =
        Math.min(
          originalMinutes,
          Math.max(
            30,
            Math.floor(
              remaining /
                30
            ) * 30
          )
        )

      if (
        duration <= 0
      ) {
        continue
      }

      result.push({
        ...task,
        panicDuration:
          duration,
      })

      usedMinutes +=
        duration
    }

    return result
  }, [
    remainingTasks,
    studyHours,
    preparation,
  ])

  // =========================================
  // PREPARATION LABEL
  // =========================================
  const preparationLabel =
    preparation < 25
      ? "I barely started 😭"
      : preparation < 50
        ? "I know some basics"
        : preparation < 75
          ? "I'm halfway there"
          : "I'm mostly prepared"

  // =========================================
  // NO EXAMS
  // =========================================
  if (
    !loadingExams &&
    exams.length === 0
  ) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-4xl">

          <div className="rounded-[2rem] border border-red-500/20 bg-red-500/5 p-10 text-center">
            <div className="text-6xl">
              🚨
            </div>

            <p className="mt-6 text-sm font-medium uppercase tracking-widest text-red-400">
              Panic Mode
            </p>

            <h1 className="mt-3 text-4xl font-black sm:text-5xl">
              No exam. No panic.
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-zinc-500">
              Add your exam first and StudentHub
              will automatically connect Panic Mode
              to it.
            </p>

            <Link
              to="/exams"
              className="mt-8 inline-block rounded-full bg-white px-7 py-3 font-bold text-black transition hover:bg-zinc-200"
            >
              ＋ Add an Exam
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">

        {/* =================================
            HEADER
        ================================== */}
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-red-400">
              Emergency Study System
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              Panic Mode 🚨
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-400">
              No fake countdowns. No separate dates.
              This uses your real StudentHub exam
              and your saved study plan.
            </p>
          </div>

          <Link
            to="/planner"
            className="w-fit rounded-full border border-zinc-800 px-5 py-2 text-sm text-zinc-400 transition hover:border-red-500/40 hover:text-white"
          >
            Open Planner →
          </Link>
        </div>

        {/* =================================
            EXAM SELECTOR
        ================================== */}
        <div className="mb-6 rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            🗓️ Which exam are you panicking about?
          </label>

          {loadingExams ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-sm text-zinc-600">
              Loading your exams...
            </div>
          ) : (
            <select
              value={
                selectedExamId
              }
              onChange={(
                event
              ) =>
                setSelectedExamId(
                  event.target.value
                )
              }
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-white outline-none focus:border-red-500"
            >
              {exams.map(
                (exam) => (
                  <option
                    key={
                      exam.id
                    }
                    value={
                      exam.id
                    }
                  >
                    {exam.subject} —{" "}
                    {formatDate(
                      exam.exam_date
                    )}
                  </option>
                )
              )}
            </select>
          )}
        </div>

        {/* =================================
            COUNTDOWN
        ================================== */}
        <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-red-500/20 bg-gradient-to-br from-red-500/10 via-zinc-900 to-zinc-950 p-7 sm:p-10">

          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />

          <div className="relative">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

              <div>
                <p className="text-sm uppercase tracking-widest text-red-400">
                  {panicLevel.emoji}{" "}
                  {panicLevel.title}
                </p>

                <h2 className="mt-3 text-3xl font-black">
                  {selectedExam?.subject}
                </h2>

                {selectedExam && (
                  <p className="mt-2 text-sm text-zinc-500">
                    {formatDate(
                      selectedExam.exam_date
                    )}
                    {" • "}
                    {formatTime(
                      selectedExam.exam_time
                    )}
                  </p>
                )}

                <p className="mt-3 text-sm text-zinc-500">
                  {
                    panicLevel.subtitle
                  }
                </p>
              </div>
            </div>

            {timeLeft?.expired ? (
              <div className="mt-8 rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center">
                <div className="text-5xl">
                  🚨
                </div>

                <h3 className="mt-4 text-3xl font-black">
                  It's exam time.
                </h3>

                <p className="mt-2 text-zinc-500">
                  The countdown has reached zero.
                </p>
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 text-center">
                  <div className="text-4xl font-black tabular-nums sm:text-5xl">
                    {String(
                      timeLeft?.days ||
                        0
                    ).padStart(
                      2,
                      "0"
                    )}
                  </div>

                  <p className="mt-2 text-xs uppercase tracking-wider text-zinc-600">
                    Days
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 text-center">
                  <div className="text-4xl font-black tabular-nums sm:text-5xl">
                    {String(
                      timeLeft?.hours ||
                        0
                    ).padStart(
                      2,
                      "0"
                    )}
                  </div>

                  <p className="mt-2 text-xs uppercase tracking-wider text-zinc-600">
                    Hours
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 text-center">
                  <div className="text-4xl font-black tabular-nums sm:text-5xl">
                    {String(
                      timeLeft?.minutes ||
                        0
                    ).padStart(
                      2,
                      "0"
                    )}
                  </div>

                  <p className="mt-2 text-xs uppercase tracking-wider text-zinc-600">
                    Minutes
                  </p>
                </div>

                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-center">
                  <div className="text-4xl font-black tabular-nums text-red-400 sm:text-5xl">
                    {String(
                      timeLeft?.seconds ||
                        0
                    ).padStart(
                      2,
                      "0"
                    )}
                  </div>

                  <p className="mt-2 text-xs uppercase tracking-wider text-red-500/70">
                    Seconds
                  </p>
                </div>

              </div>
            )}
          </div>
        </section>

        {/* =================================
            STATS
        ================================== */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
            <p className="text-xs uppercase tracking-widest text-zinc-600">
              Remaining sessions
            </p>

            <p className="mt-3 text-4xl font-black">
              {loadingTasks
                ? "—"
                : remainingTasks.length}
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              still waiting for you
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
            <p className="text-xs uppercase tracking-widest text-zinc-600">
              Study time remaining
            </p>

            <p className="mt-3 text-4xl font-black">
              {loadingTasks
                ? "—"
                : `${Math.round(
                    remainingMinutes /
                      60
                  )}h`}
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              based on your saved plan
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
            <p className="text-xs uppercase tracking-widest text-zinc-600">
              Sessions completed
            </p>

            <p className="mt-3 text-4xl font-black">
              {loadingTasks
                ? "—"
                : completedTasks}
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              already finished
            </p>
          </div>
        </div>

        {/* =================================
            PANIC SETTINGS + EMERGENCY PLAN
        ================================== */}
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">

          {/* SETTINGS */}
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-7">

            <p className="text-sm uppercase tracking-widest text-red-400">
              Emergency settings
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Let's be realistic.
            </h2>

            {/* Hours */}
            <div className="mt-7">
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                ⏱️ Hours you can study today
              </label>

              <input
                type="number"
                min="1"
                max="16"
                value={
                  studyHours
                }
                onChange={(
                  event
                ) =>
                  setStudyHours(
                    event.target.value
                  )
                }
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-white outline-none focus:border-red-500"
              />
            </div>

            {/* Preparation */}
            <div className="mt-7">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300">
                  🧠 How prepared are you?
                </label>

                <span className="font-bold text-red-400">
                  {preparation}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={
                  preparation
                }
                onChange={(
                  event
                ) =>
                  setPreparation(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="mt-5 w-full accent-red-500"
              />

              <div className="mt-3 flex justify-between text-xs text-zinc-600">
                <span>
                  0%
                </span>
                <span>
                  50%
                </span>
                <span>
                  100%
                </span>
              </div>

              <p className="mt-4 rounded-2xl bg-red-500/5 p-4 text-sm text-zinc-400">
                {preparationLabel}
              </p>
            </div>

            <div className="mt-7 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-600">
                Panic Mode rule
              </p>

              <p className="mt-3 text-sm leading-6 text-zinc-500">
                High-priority unfinished sessions are
                pushed toward the front. We focus on
                what can realistically be completed
                before the exam.
              </p>
            </div>
          </div>

          {/* EMERGENCY PLAN */}
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-7">

            <p className="text-sm uppercase tracking-widest text-red-400">
              Emergency plan
            </p>

            <h2 className="mt-2 text-2xl font-black">
              What you should attack first.
            </h2>

            {loadingTasks ? (
              <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 text-center">
                <div className="text-4xl">
                  ⏳
                </div>

                <p className="mt-3 text-sm text-zinc-600">
                  Loading your saved plan...
                </p>
              </div>
            ) : emergencyPlan.length ===
              0 ? (
              <div className="mt-8 rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/30 p-8 text-center">
                <div className="text-5xl">
                  🎉
                </div>

                <h3 className="mt-4 text-xl font-bold">
                  Nothing urgent left.
                </h3>

                <p className="mt-2 text-sm text-zinc-600">
                  Either you've completed your plan or
                  you haven't created one yet.
                </p>

                <Link
                  to="/planner"
                  className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-zinc-200"
                >
                  Open Planner
                </Link>
              </div>
            ) : (
              <div className="mt-7 space-y-3">

                {emergencyPlan.map(
                  (
                    task,
                    index
                  ) => (
                    <div
                      key={
                        task.id
                      }
                      className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5"
                    >
                      <div className="flex items-start gap-4">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 font-black text-red-400">
                          {index +
                            1}
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">
                              {
                                task.task_title
                              }
                            </h3>

                            <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] uppercase tracking-wide text-red-300">
                              {
                                task.priority
                              }
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-600">
                            <span>
                              📅{" "}
                              {formatDate(
                                task.task_date
                              )}
                            </span>

                            <span>
                              ⏱️{" "}
                              {
                                task.panicDuration
                              }{" "}
                              min
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}

              </div>
            )}
          </div>
        </div>

        {/* =================================
            FOOTER
        ================================== */}
        <div className="py-12 text-center">
          <p className="text-sm text-zinc-600">
            Panic responsibly. Study aggressively. 🚀
          </p>
        </div>

      </div>
    </main>
  )
}

export default PanicMode