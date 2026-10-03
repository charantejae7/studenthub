import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatTime(time) {
  if (!time) return "Time not set"

  const [hours, minutes] = time.split(":")
  const date = new Date()

  date.setHours(Number(hours))
  date.setMinutes(Number(minutes))
  date.setSeconds(0)

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatTimeRange(start, end) {
  if (!start) return "Time not set"

  return `${formatTime(start)}${
    end ? ` – ${formatTime(end)}` : ""
  }`
}

function getPriorityClass(priority) {
  if (priority === "High") {
    return "border-red-500/30 bg-red-500/10 text-red-300"
  }

  if (priority === "Low") {
    return "border-zinc-700 bg-zinc-800 text-zinc-400"
  }

  return "border-violet-500/30 bg-violet-500/10 text-violet-300"
}

function Schedule() {
  const today = new Date()

  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  )

  const [selectedDate, setSelectedDate] = useState(
    formatDateKey(today)
  )

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [filter, setFilter] = useState("All")

  const loadSchedule = async () => {
    setLoading(true)

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      setLoading(false)
      return
    }

    setUser(currentUser)

    const { data, error } = await supabase
      .from("study_tasks")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("task_date", { ascending: true })
      .order("start_time", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Failed to load schedule:", error)
      setTasks([])
    } else {
      setTasks(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadSchedule()
  }, [])

  const subjects = useMemo(() => {
    const uniqueSubjects = [
      ...new Set(tasks.map((task) => task.subject).filter(Boolean)),
    ]

    return uniqueSubjects.sort()
  }, [tasks])

  const filteredTasks = useMemo(() => {
    if (filter === "All") return tasks

    return tasks.filter((task) => task.subject === filter)
  }, [tasks, filter])

  const tasksByDate = useMemo(() => {
    const grouped = {}

    filteredTasks.forEach((task) => {
      if (!grouped[task.task_date]) {
        grouped[task.task_date] = []
      }

      grouped[task.task_date].push(task)
    })

    return grouped
  }, [filteredTasks])

  const selectedTasks = tasksByDate[selectedDate] || []

  const selectedCompletedCount = selectedTasks.filter(
    (task) => task.completed
  ).length

  const selectedTotalMinutes = selectedTasks.reduce(
    (sum, task) => sum + Number(task.duration_minutes || 0),
    0
  )

  const selectedCompletedMinutes = selectedTasks
    .filter((task) => task.completed)
    .reduce(
      (sum, task) => sum + Number(task.duration_minutes || 0),
      0
    )

  const monthPrefix = `${currentMonth.getFullYear()}-${String(
    currentMonth.getMonth() + 1
  ).padStart(2, "0")}`

  const monthTasks = filteredTasks.filter((task) =>
    task.task_date.startsWith(monthPrefix)
  )

  const monthMinutes = monthTasks.reduce(
    (sum, task) => sum + Number(task.duration_minutes || 0),
    0
  )

  const monthCompletedMinutes = monthTasks
    .filter((task) => task.completed)
    .reduce(
      (sum, task) => sum + Number(task.duration_minutes || 0),
      0
    )

  const monthCompletedTasks = monthTasks.filter(
    (task) => task.completed
  ).length

  const firstDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay()

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate()

  const calendarCells = []

  for (let i = 0; i < firstDay; i += 1) {
    calendarCells.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarCells.push(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      )
    )
  }

  const changeMonth = (amount) => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + amount,
        1
      )
    )
  }

  const goToToday = () => {
    const now = new Date()

    setCurrentMonth(
      new Date(now.getFullYear(), now.getMonth(), 1)
    )

    setSelectedDate(formatDateKey(now))
  }

  const selectDate = (date) => {
    setSelectedDate(formatDateKey(date))
  }

  const toggleTask = async (task) => {
    setSaving(true)

    const { error } = await supabase
      .from("study_tasks")
      .update({
        completed: !task.completed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id)
      .eq("user_id", user?.id)

    if (error) {
      console.error("Failed to update task:", error)
      setSaving(false)
      return
    }

    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item.id === task.id
          ? {
              ...item,
              completed: !item.completed,
            }
          : item
      )
    )

    setSaving(false)
  }

  const selectedDateObject = new Date(`${selectedDate}T00:00:00`)

  const selectedDateLabel = selectedDateObject.toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    }
  )

  const isToday = selectedDate === formatDateKey(today)

  const sortedSelectedTasks = [...selectedTasks].sort((a, b) => {
    if (!a.start_time && !b.start_time) return 0
    if (!a.start_time) return 1
    if (!b.start_time) return -1

    return a.start_time.localeCompare(b.start_time)
  })

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-zinc-950 px-6">
        <div className="text-center">
          <div className="text-5xl">📅</div>

          <p className="mt-4 text-sm text-zinc-500">
            Loading your schedule...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}

        <section className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-400">
                StudentHub
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                Your Schedule
              </h1>

              <p className="mt-3 max-w-2xl text-zinc-400">
                See exactly what you need to study and when you need
                to study it.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={goToToday}
                className="rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-bold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
              >
                Today
              </button>

              <Link
                to="/planner"
                className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-400"
              >
                📝 Edit Planner
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">This month</p>

            <p className="mt-2 text-3xl font-black">
              {monthTasks.length}
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              study sessions
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">Study time</p>

            <p className="mt-2 text-3xl font-black">
              {Math.floor(monthMinutes / 60)}h{" "}
              {monthMinutes % 60}m
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              planned this month
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">Completed</p>

            <p className="mt-2 text-3xl font-black">
              {monthCompletedTasks}
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              sessions finished
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">
              Progress
            </p>

            <p className="mt-2 text-3xl font-black">
              {monthMinutes > 0
                ? Math.round(
                    (monthCompletedMinutes / monthMinutes) * 100
                  )
                : 0}
              %
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              study time completed
            </p>
          </div>
        </section>

        {/* Filters */}

        <section className="mb-6 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-zinc-500">
            Filter:
          </span>

          <button
            onClick={() => setFilter("All")}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              filter === "All"
                ? "bg-violet-500 text-white"
                : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            All
          </button>

          {subjects.map((subject) => (
            <button
              key={subject}
              onClick={() => setFilter(subject)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                filter === subject
                  ? "bg-violet-500 text-white"
                  : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              {subject}
            </button>
          ))}
        </section>

        {/* Main layout */}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Calendar */}

          <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/70 p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">
                  Calendar
                </p>

                <h2 className="text-2xl font-black">
                  {MONTHS[currentMonth.getMonth()]}{" "}
                  {currentMonth.getFullYear()}
                </h2>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => changeMonth(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 text-lg text-zinc-300 hover:bg-zinc-800"
                >
                  ←
                </button>

                <button
                  onClick={() => changeMonth(1)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 text-lg text-zinc-300 hover:bg-zinc-800"
                >
                  →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-600 sm:text-xs"
                >
                  {day.slice(0, 3)}
                </div>
              ))}

              {calendarCells.map((date, index) => {
                if (!date) {
                  return (
                    <div
                      key={`blank-${index}`}
                      className="min-h-[84px]"
                    />
                  )
                }

                const key = formatDateKey(date)
                const dayTasks = tasksByDate[key] || []

                const completed = dayTasks.filter(
                  (task) => task.completed
                ).length

                const allComplete =
                  dayTasks.length > 0 &&
                  completed === dayTasks.length

                const selected = key === selectedDate
                const todayDate = key === formatDateKey(today)

                return (
                  <button
                    key={key}
                    onClick={() => selectDate(date)}
                    className={`min-h-[84px] rounded-2xl border p-2 text-left transition ${
                      selected
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-bold ${
                          todayDate
                            ? "text-violet-400"
                            : "text-zinc-300"
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      {todayDate && (
                        <span className="text-[9px] font-bold uppercase text-violet-400">
                          Today
                        </span>
                      )}
                    </div>

                    {dayTasks.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              allComplete
                                ? "bg-emerald-400"
                                : "bg-violet-400"
                            }`}
                          />

                          <span className="text-xs font-semibold text-zinc-500">
                            {completed}/{dayTasks.length}
                          </span>
                        </div>

                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-violet-500 transition-all"
                            style={{
                              width: `${
                                dayTasks.length
                                  ? (completed / dayTasks.length) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Day timeline */}

          <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/70 p-5 sm:p-7">
            <div className="mb-6">
              <p className="text-sm text-zinc-500">
                {isToday ? "Today" : "Selected day"}
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {selectedDateLabel}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                {selectedTasks.length} study session
                {selectedTasks.length === 1 ? "" : "s"} ·{" "}
                {selectedTotalMinutes} minutes planned
              </p>
            </div>

            {selectedTasks.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center">
                <div className="text-5xl">🌿</div>

                <h3 className="mt-5 text-xl font-bold">
                  No study sessions
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                  Nothing is planned for this day. Use the Planner
                  to create study sessions.
                </p>

                <Link
                  to="/planner"
                  className="mt-5 rounded-2xl bg-violet-500 px-5 py-3 text-sm font-bold text-white hover:bg-violet-400"
                >
                  Create Study Plan
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">
                      Day progress
                    </span>

                    <span className="font-bold text-white">
                      {selectedCompletedCount}/
                      {selectedTasks.length}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{
                        width: `${
                          selectedTasks.length
                            ? (selectedCompletedCount /
                                selectedTasks.length) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {sortedSelectedTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`rounded-2xl border p-4 transition ${
                        task.completed
                          ? "border-emerald-500/20 bg-emerald-500/5"
                          : "border-zinc-800 bg-zinc-950"
                      }`}
                    >
                      <div className="flex gap-4">
                        <button
                          onClick={() => toggleTask(task)}
                          disabled={saving}
                          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
                            task.completed
                              ? "border-emerald-400 bg-emerald-400 text-zinc-950"
                              : "border-zinc-600 bg-transparent text-transparent hover:border-violet-400"
                          }`}
                        >
                          ✓
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-violet-400">
                              {formatTimeRange(
                                task.start_time,
                                task.end_time
                              )}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getPriorityClass(
                                task.priority
                              )}`}
                            >
                              {task.priority}
                            </span>
                          </div>

                          <h3
                            className={`mt-2 font-bold ${
                              task.completed
                                ? "text-zinc-500 line-through"
                                : "text-white"
                            }`}
                          >
                            {task.task_title}
                          </h3>

                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                            <span>📚 {task.subject}</span>
                            <span>
                              ⏱ {task.duration_minutes} min
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        {/* Bottom links */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/dashboard"
            className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 transition hover:-translate-y-1 hover:border-violet-500/40"
          >
            <p className="text-2xl">📊</p>

            <h3 className="mt-3 font-bold">
              Back to Dashboard
            </h3>

            <p className="mt-1 text-sm text-zinc-500">
              See your overall progress and activity.
            </p>
          </Link>

          <Link
            to="/planner"
            className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 transition hover:-translate-y-1 hover:border-violet-500/40"
          >
            <p className="text-2xl">📝</p>

            <h3 className="mt-3 font-bold">
              Change Study Plan
            </h3>

            <p className="mt-1 text-sm text-zinc-500">
              Generate or update your study sessions.
            </p>
          </Link>

          <Link
            to="/panic-mode"
            className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 transition hover:-translate-y-1 hover:border-red-500/40"
          >
            <p className="text-2xl">🚨</p>

            <h3 className="mt-3 font-bold">
              Panic Mode
            </h3>

            <p className="mt-1 text-sm text-zinc-500">
              Get an emergency revision plan before an exam.
            </p>
          </Link>
        </section>
      </div>
    </main>
  )
}

export default Schedule