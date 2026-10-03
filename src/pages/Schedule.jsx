import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

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

function Schedule() {
  const today = new Date()

  const [tasks, setTasks] = useState([])
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  )
  const [selectedDate, setSelectedDate] = useState(
    formatDateKey(today)
  )
  const [selectedSubject, setSelectedSubject] = useState("All")
  const [loading, setLoading] = useState(true)

  const loadTasks = async () => {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("study_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("task_date", { ascending: true })
      .order("start_time", { ascending: true })

    if (error) {
      console.error("Schedule loading error:", error)
      setTasks([])
    } else {
      setTasks(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const subjects = useMemo(() => {
    const values = tasks
      .map((task) => task.subject)
      .filter(Boolean)

    return [...new Set(values)].sort()
  }, [tasks])

  const filteredTasks = useMemo(() => {
    if (selectedSubject === "All") return tasks

    return tasks.filter(
      (task) => task.subject === selectedSubject
    )
  }, [tasks, selectedSubject])

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

  const monthPrefix = `${currentMonth.getFullYear()}-${String(
    currentMonth.getMonth() + 1
  ).padStart(2, "0")}`

  const monthTasks = filteredTasks.filter((task) =>
    task.task_date.startsWith(monthPrefix)
  )

  const monthMinutes = monthTasks.reduce(
    (total, task) =>
      total + Number(task.duration_minutes || 0),
    0
  )

  const monthCompleted = monthTasks.filter(
    (task) => task.completed
  ).length

  const monthProgress =
    monthTasks.length > 0
      ? Math.round((monthCompleted / monthTasks.length) * 100)
      : 0

  const selectedTasks = [...(tasksByDate[selectedDate] || [])].sort(
    (a, b) =>
      (a.start_time || "").localeCompare(b.start_time || "")
  )

  const selectedMinutes = selectedTasks.reduce(
    (total, task) =>
      total + Number(task.duration_minutes || 0),
    0
  )

  const selectedCompleted = selectedTasks.filter(
    (task) => task.completed
  ).length

  const selectedProgress =
    selectedTasks.length > 0
      ? Math.round(
          (selectedCompleted / selectedTasks.length) * 100
        )
      : 0

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

  const calendarDays = []

  for (let i = 0; i < firstDay; i += 1) {
    calendarDays.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarDays.push(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      )
    )
  }

  const selectedDateObject = new Date(
    `${selectedDate}T00:00:00`
  )

  const selectedDateLabel = selectedDateObject.toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  )

  const isToday = selectedDate === formatDateKey(today)

  const changeMonth = (amount) => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + amount,
        1
      )
    )
  }

  const goToday = () => {
    const now = new Date()

    setCurrentMonth(
      new Date(now.getFullYear(), now.getMonth(), 1)
    )

    setSelectedDate(formatDateKey(now))
  }

  const toggleTask = async (task) => {
    const { data } = await supabase.auth.getUser()
    const user = data?.user

    if (!user) return

    const { error } = await supabase
      .from("study_tasks")
      .update({
        completed: !task.completed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id)
      .eq("user_id", user.id)

    if (error) {
      console.error(error)
      return
    }

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              completed: !item.completed,
            }
          : item
      )
    )
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <div className="text-5xl">📅</div>
          <p className="mt-4 text-sm text-zinc-500">
            Loading your timetable...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}

        <section className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-400">
                StudentHub
              </p>

              <h1 className="mt-2 text-4xl font-black sm:text-5xl">
                Your Schedule
              </h1>

              <p className="mt-3 max-w-2xl text-zinc-400">
                Your actual study timetable — what to study,
                on which day, and at what time.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={goToday}
                className="rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-bold hover:bg-zinc-800"
              >
                Today
              </button>

              <Link
                to="/planner"
                className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-bold hover:bg-violet-400"
              >
                📝 Edit Planner
              </Link>
            </div>
          </div>
        </section>

        {/* Monthly stats */}

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">
              Planned sessions
            </p>

            <p className="mt-2 text-3xl font-black">
              {monthTasks.length}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">
              Study time
            </p>

            <p className="mt-2 text-3xl font-black">
              {Math.floor(monthMinutes / 60)}h{" "}
              {monthMinutes % 60}m
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">
              Completion
            </p>

            <p className="mt-2 text-3xl font-black">
              {monthProgress}%
            </p>
          </div>
        </section>

        {/* Subject filter */}

        <section className="mb-6 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm font-semibold text-zinc-500">
            Subject:
          </span>

          <button
            onClick={() => setSelectedSubject("All")}
            className={`rounded-full px-4 py-2 text-xs font-bold ${
              selectedSubject === "All"
                ? "bg-violet-500 text-white"
                : "border border-zinc-800 bg-zinc-900 text-zinc-400"
            }`}
          >
            All
          </button>

          {subjects.map((subject) => (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={`rounded-full px-4 py-2 text-xs font-bold ${
                selectedSubject === subject
                  ? "bg-violet-500 text-white"
                  : "border border-zinc-800 bg-zinc-900 text-zinc-400"
              }`}
            >
              {subject}
            </button>
          ))}
        </section>

        {/* Calendar + timeline */}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Calendar */}

          <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/70 p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">
                  Monthly timetable
                </p>

                <h2 className="text-2xl font-black">
                  {MONTHS[currentMonth.getMonth()]}{" "}
                  {currentMonth.getFullYear()}
                </h2>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => changeMonth(-1)}
                  className="h-10 w-10 rounded-xl border border-zinc-700 bg-zinc-950 text-lg hover:bg-zinc-800"
                >
                  ←
                </button>

                <button
                  onClick={() => changeMonth(1)}
                  className="h-10 w-10 rounded-xl border border-zinc-700 bg-zinc-950 text-lg hover:bg-zinc-800"
                >
                  →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="pb-2 text-center text-xs font-bold uppercase text-zinc-600"
                >
                  {day}
                </div>
              ))}

              {calendarDays.map((date, index) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="min-h-[85px]"
                    />
                  )
                }

                const key = formatDateKey(date)
                const dayTasks = tasksByDate[key] || []
                const dayCompleted = dayTasks.filter(
                  (task) => task.completed
                ).length

                const todayCell =
                  key === formatDateKey(today)

                const selected =
                  key === selectedDate

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    className={`min-h-[85px] rounded-2xl border p-2 text-left transition ${
                      selected
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-bold ${
                          todayCell
                            ? "text-violet-400"
                            : "text-zinc-300"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </div>

                    {dayTasks.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-violet-400" />

                          <span className="text-[11px] text-zinc-500">
                            {dayCompleted}/{dayTasks.length}
                          </span>
                        </div>

                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{
                              width: `${
                                (dayCompleted /
                                  dayTasks.length) *
                                100
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

          {/* Daily timetable */}

          <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/70 p-5 sm:p-7">
            <p className="text-sm text-zinc-500">
              {isToday ? "Today's timetable" : "Selected day"}
            </p>

            <h2 className="mt-1 text-2xl font-black">
              {selectedDateLabel}
            </h2>

            <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">
                  Day progress
                </span>

                <span className="font-bold">
                  {selectedCompleted}/{selectedTasks.length}
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{
                    width: `${selectedProgress}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-xs text-zinc-600">
                {selectedMinutes} minutes planned
              </p>
            </div>

            {selectedTasks.length === 0 ? (
              <div className="mt-5 flex min-h-[300px] items-center justify-center rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center">
                <div>
                  <div className="text-5xl">🌿</div>

                  <h3 className="mt-4 text-xl font-bold">
                    No study session
                  </h3>

                  <p className="mt-2 text-sm text-zinc-500">
                    Nothing is scheduled for this day.
                  </p>

                  <Link
                    to="/planner"
                    className="mt-5 inline-block rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold hover:bg-violet-400"
                  >
                    Create Plan
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {selectedTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-2xl border p-4 ${
                      task.completed
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-zinc-800 bg-zinc-950"
                    }`}
                  >
                    <div className="flex gap-4">
                      <button
                        onClick={() => toggleTask(task)}
                        className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                          task.completed
                            ? "border-emerald-400 bg-emerald-400 text-zinc-950"
                            : "border-zinc-600 text-transparent hover:border-violet-400"
                        }`}
                      >
                        ✓
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-violet-400">
                          {formatTime(task.start_time)}
                          {task.end_time
                            ? ` – ${formatTime(task.end_time)}`
                            : ""}
                        </p>

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
                          <span>
                            📚 {task.subject}
                          </span>

                          <span>
                            ⏱ {task.duration_minutes} min
                          </span>

                          <span>
                            ⚡ {task.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

export default Schedule