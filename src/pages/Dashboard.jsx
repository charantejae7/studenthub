import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"

  return "Good evening"
}

function getDaysBetween(dateA, dateB) {
  const a = new Date(`${dateA}T00:00:00`)
  const b = new Date(`${dateB}T00:00:00`)

  return Math.round(
    (b - a) / (1000 * 60 * 60 * 24)
  )
}

function formatCountdown(totalSeconds) {
  if (totalSeconds <= 0) {
    return "Exam time"
  }

  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  )
  const seconds = totalSeconds % 60

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }

  return `${minutes}m ${seconds}s`
}

function Dashboard() {
  const [user, setUser] = useState(null)

  const [profile, setProfile] = useState(null)
  const [exams, setExams] = useState([])
  const [tasks, setTasks] = useState([])
  const [resources, setResources] = useState([])

  const [countdown, setCountdown] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const todayKey = formatDateKey(new Date())

  const loadDashboard = async () => {
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

    const [
      profileResult,
      examsResult,
      tasksResult,
      resourcesResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle(),

      supabase
        .from("exams")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("exam_date", { ascending: true })
        .order("exam_time", { ascending: true }),

      supabase
        .from("study_tasks")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("task_date", { ascending: true })
        .order("start_time", { ascending: true }),

      supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
    ])

    if (profileResult.error) {
      console.error(profileResult.error)
    } else {
      setProfile(profileResult.data)
    }

    if (examsResult.error) {
      console.error(examsResult.error)
    } else {
      setExams(examsResult.data || [])
    }

    if (tasksResult.error) {
      console.error(tasksResult.error)
    } else {
      setTasks(tasksResult.data || [])
    }

    if (resourcesResult.error) {
      console.error(resourcesResult.error)
    } else {
      setResources(resourcesResult.data || [])
    }

    if (
      profileResult.error ||
      examsResult.error ||
      tasksResult.error
    ) {
      setError(
        "Some dashboard information could not be loaded."
      )
    }

    setLoading(false)
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const upcomingExams = useMemo(() => {
    const now = new Date()

    return exams.filter((exam) => {
      const date = new Date(
        `${exam.exam_date}T${
          exam.exam_time || "09:00:00"
        }`
      )

      return date > now
    })
  }, [exams])

  const nextExam = upcomingExams[0] || null

  useEffect(() => {
    if (!nextExam) {
      setCountdown("No upcoming exam")
      return
    }

    const updateCountdown = () => {
      const examTime = new Date(
        `${nextExam.exam_date}T${
          nextExam.exam_time || "09:00:00"
        }`
      )

      const seconds = Math.floor(
        (examTime.getTime() - Date.now()) / 1000
      )

      setCountdown(formatCountdown(seconds))
    }

    updateCountdown()

    const interval = setInterval(
      updateCountdown,
      1000
    )

    return () => clearInterval(interval)
  }, [nextExam])

  const totalTasks = tasks.length

  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length

  const overallProgress =
    totalTasks > 0
      ? Math.round(
          (completedTasks / totalTasks) * 100
        )
      : 0

  const todaysTasks = tasks.filter(
    (task) => task.task_date === todayKey
  )

  const todayCompleted = todaysTasks.filter(
    (task) => task.completed
  ).length

  const todayMinutes = todaysTasks.reduce(
    (sum, task) =>
      sum + Number(task.duration_minutes || 0),
    0
  )

  const completedMinutes = tasks
    .filter((task) => task.completed)
    .reduce(
      (sum, task) =>
        sum + Number(task.duration_minutes || 0),
      0
    )

  const pendingTasks = tasks.filter(
    (task) => !task.completed
  )

  const todaysPendingTasks = todaysTasks.filter(
    (task) => !task.completed
  )

  const missionTask =
    todaysPendingTasks[0] ||
    pendingTasks.find(
      (task) => task.task_date >= todayKey
    ) ||
    pendingTasks[0] ||
    null

  const studyDates = useMemo(() => {
    return new Set(
      tasks
        .filter((task) => task.completed)
        .map((task) => task.task_date)
    )
  }, [tasks])

  const currentStreak = useMemo(() => {
    if (studyDates.size === 0) return 0

    let streak = 0
    const cursor = new Date()

    while (true) {
      const key = formatDateKey(cursor)

      if (!studyDates.has(key)) {
        break
      }

      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    return streak
  }, [studyDates])

  const bestStreak = useMemo(() => {
    if (studyDates.size === 0) return 0

    const dates = [...studyDates].sort()
    let best = 1
    let current = 1

    for (let i = 1; i < dates.length; i += 1) {
      if (
        getDaysBetween(
          dates[i - 1],
          dates[i]
        ) === 1
      ) {
        current += 1
        best = Math.max(best, current)
      } else {
        current = 1
      }
    }

    return best
  }, [studyDates])

  const completionRate =
    totalTasks > 0
      ? Math.round(
          (completedTasks / totalTasks) * 100
        )
      : 0

  const firstName =
    profile?.name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Student"

  const subjectStats = useMemo(() => {
    const map = {}

    tasks.forEach((task) => {
      if (!map[task.subject]) {
        map[task.subject] = {
          total: 0,
          completed: 0,
          minutes: 0,
        }
      }

      map[task.subject].total += 1

      map[task.subject].minutes += Number(
        task.duration_minutes || 0
      )

      if (task.completed) {
        map[task.subject].completed += 1
      }
    })

    return Object.entries(map)
      .map(([subject, data]) => ({
        subject,
        ...data,
        progress:
          data.total > 0
            ? Math.round(
                (data.completed / data.total) *
                  100
              )
            : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [tasks])

  const toggleTask = async (task) => {
    const { data } = await supabase.auth.getUser()
    const currentUser = data?.user

    if (!currentUser) return

    const { error: updateError } = await supabase
      .from("study_tasks")
      .update({
        completed: !task.completed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id)
      .eq("user_id", currentUser.id)

    if (updateError) {
      console.error(updateError)
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
          <div className="text-5xl">🎓</div>

          <p className="mt-4 text-sm text-zinc-500">
            Loading your dashboard...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Welcome */}

        <section className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-400">
                {getGreeting()} 👋
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                {firstName}
              </h1>

              <p className="mt-3 text-zinc-500">
                Let's make today's study count.
              </p>

              {profile && (
                <p className="mt-2 text-xs text-zinc-700">
                  {profile.course || "Student"}
                  {profile.college
                    ? ` · ${profile.college}`
                    : ""}
                  {profile.semester
                    ? ` · Semester ${profile.semester}`
                    : ""}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/focus"
                className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-bold hover:bg-violet-400"
              >
                ▶ Start Focus
              </Link>

              <Link
                to="/schedule"
                className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-800"
              >
                📅 Schedule
              </Link>
            </div>
          </div>
        </section>

        {/* Today's mission */}

        <section className="mb-6 overflow-hidden rounded-[2rem] border border-violet-500/20 bg-violet-500/5">
          <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
            <div className="p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
                Today's Mission
              </p>

              {missionTask ? (
                <>
                  <h2 className="mt-3 max-w-2xl text-2xl font-black sm:text-3xl">
                    {missionTask.task_title}
                  </h2>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-zinc-400">
                      📚 {missionTask.subject}
                    </span>

                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-zinc-400">
                      ⏱ {missionTask.duration_minutes} min
                    </span>

                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-zinc-400">
                      ⚡ {missionTask.priority}
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-zinc-500">
                    Focus on this one task before moving to the
                    next.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      to="/focus"
                      className="rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-bold hover:bg-violet-400"
                    >
                      Start this task
                    </Link>

                    <button
                      onClick={() =>
                        toggleTask(missionTask)
                      }
                      className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-bold text-zinc-300 hover:bg-zinc-900"
                    >
                      Mark complete
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mt-3 text-2xl font-black">
                    You're all caught up 🎉
                  </h2>

                  <p className="mt-3 text-sm text-zinc-500">
                    No pending study task is waiting for you.
                  </p>

                  <Link
                    to="/planner"
                    className="mt-5 inline-block rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-bold"
                  >
                    Create a Study Plan
                  </Link>
                </>
              )}
            </div>

            <div className="flex min-w-[220px] items-center justify-center border-t border-violet-500/10 bg-black/10 p-6 lg:border-l lg:border-t-0">
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">
                  Today
                </p>

                <p className="mt-2 text-4xl font-black">
                  {todayCompleted}/{todaysTasks.length}
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  tasks completed
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main stats */}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">
              Overall progress
            </p>

            <p className="mt-2 text-3xl font-black">
              {overallProgress}%
            </p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-violet-500"
                style={{
                  width: `${overallProgress}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">
              Today's study
            </p>

            <p className="mt-2 text-3xl font-black">
              {Math.floor(todayMinutes / 60)}h{" "}
              {todayMinutes % 60}m
            </p>

            <p className="mt-2 text-xs text-zinc-600">
              planned time
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">
              Study streak
            </p>

            <p className="mt-2 text-3xl font-black">
              🔥 {currentStreak}
            </p>

            <p className="mt-2 text-xs text-zinc-600">
              best: {bestStreak} day
              {bestStreak === 1 ? "" : "s"}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">
              Completed time
            </p>

            <p className="mt-2 text-3xl font-black">
              {Math.floor(completedMinutes / 60)}h
            </p>

            <p className="mt-2 text-xs text-zinc-600">
              {completedTasks} tasks completed
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          {/* Next exam */}

          <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/70 p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">
                  Next exam
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {nextExam
                    ? nextExam.subject
                    : "No upcoming exam"}
                </h2>
              </div>

              <span className="text-3xl">
                ⏳
              </span>
            </div>

            {nextExam ? (
              <div className="mt-7">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                  <p className="text-4xl font-black tracking-tight text-violet-300">
                    {countdown}
                  </p>

                  <p className="mt-2 text-sm text-zinc-500">
                    until {nextExam.exam_date}
                  </p>

                  <p className="mt-1 text-xs text-zinc-700">
                    Exam time:{" "}
                    {nextExam.exam_time ||
                      "09:00:00"}
                  </p>
                </div>

                <Link
                  to="/panic-mode"
                  className="mt-4 inline-block text-sm font-bold text-violet-400 hover:text-violet-300"
                >
                  Need an emergency revision plan? →
                </Link>
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-dashed border-zinc-700 bg-zinc-950 p-6">
                <p className="text-sm text-zinc-500">
                  Add your next exam to start planning.
                </p>

                <Link
                  to="/exams"
                  className="mt-4 inline-block rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold"
                >
                  Add Exam
                </Link>
              </div>
            )}
          </section>

          {/* Today's sessions */}

          <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/70 p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">
                  Today's sessions
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Your workload
                </h2>
              </div>

              <Link
                to="/schedule"
                className="text-xs font-bold text-violet-400"
              >
                View all →
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {todaysTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 p-6 text-center">
                  <p className="text-sm font-semibold">
                    No sessions today.
                  </p>

                  <p className="mt-2 text-xs text-zinc-600">
                    Enjoy the free time or plan your next session.
                  </p>
                </div>
              ) : (
                todaysTasks
                  .slice(0, 5)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3"
                    >
                      <button
                        onClick={() => toggleTask(task)}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                          task.completed
                            ? "border-emerald-400 bg-emerald-400 text-zinc-950"
                            : "border-zinc-600 text-transparent hover:border-violet-400"
                        }`}
                      >
                        ✓
                      </button>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-bold ${
                            task.completed
                              ? "text-zinc-500 line-through"
                              : "text-zinc-200"
                          }`}
                        >
                          {task.task_title}
                        </p>

                        <p className="mt-1 text-[11px] text-zinc-600">
                          {task.subject} ·{" "}
                          {task.duration_minutes} min
                        </p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </section>
        </div>

        {/* Subject progress */}

        <section className="mt-6 rounded-[2rem] border border-zinc-800 bg-zinc-900/70 p-6 sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">
                Subjects
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Progress by subject
              </h2>
            </div>
          </div>

          {subjectStats.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 p-6 text-center">
              <p className="text-sm text-zinc-500">
                Generate a study plan to see subject progress.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {subjectStats.map((subject) => (
                <div
                  key={subject.subject}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-bold">
                      {subject.subject}
                    </p>

                    <p className="text-sm font-black text-violet-300">
                      {subject.progress}%
                    </p>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{
                        width: `${subject.progress}%`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-xs text-zinc-600">
                    {subject.completed}/
                    {subject.total} sessions ·{" "}
                    {subject.minutes} min
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent resources */}

        <section className="mt-6 rounded-[2rem] border border-zinc-800 bg-zinc-900/70 p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">
                Resources
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Recently added
              </h2>
            </div>

            <Link
              to="/resources"
              className="text-xs font-bold text-violet-400"
            >
              Browse all →
            </Link>
          </div>

          {resources.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 p-6 text-center">
              <p className="text-sm text-zinc-500">
                No resources yet.
              </p>

              <Link
                to="/resources"
                className="mt-4 inline-block rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold"
              >
                Explore Resources
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {resources.map((resource) => (
                <Link
                  key={resource.id}
                  to={`/resources/${resource.id}`}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:-translate-y-1 hover:border-violet-500/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-violet-500/10 px-3 py-1 text-[10px] font-bold text-violet-300">
                      {resource.resource_type}
                    </span>

                    <span className="text-xs text-zinc-700">
                      ↓ {resource.downloads || 0}
                    </span>
                  </div>

                  <h3 className="mt-4 line-clamp-2 font-bold">
                    {resource.title}
                  </h3>

                  <p className="mt-2 text-xs text-zinc-600">
                    {resource.subject}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick actions */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/exams"
            className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-violet-500/30"
          >
            <p className="text-2xl">📝</p>
            <h3 className="mt-3 font-bold">
              Manage Exams
            </h3>
            <p className="mt-1 text-xs text-zinc-600">
              {exams.length} exam
              {exams.length === 1 ? "" : "s"} added
            </p>
          </Link>

          <Link
            to="/planner"
            className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-violet-500/30"
          >
            <p className="text-2xl">🧠</p>
            <h3 className="mt-3 font-bold">
              Build a Plan
            </h3>
            <p className="mt-1 text-xs text-zinc-600">
              Generate study sessions
            </p>
          </Link>

          <Link
            to="/focus"
            className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-violet-500/30"
          >
            <p className="text-2xl">🎯</p>
            <h3 className="mt-3 font-bold">
              Focus Mode
            </h3>
            <p className="mt-1 text-xs text-zinc-600">
              Start a focused session
            </p>
          </Link>

          <Link
            to="/profile"
            className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 hover:border-violet-500/30"
          >
            <p className="text-2xl">👤</p>
            <h3 className="mt-3 font-bold">
              Profile
            </h3>
            <p className="mt-1 text-xs text-zinc-600">
              Update your student details
            </p>
          </Link>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300">
            {error}
          </div>
        )}
      </div>
    </main>
  )
}

export default Dashboard