import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

const PRIORITIES = ["High", "Medium", "Low"]

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function differenceInDays(start, end) {
  const startDate = new Date(start)
  const endDate = new Date(end)

  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(0, 0, 0, 0)

  return Math.floor(
    (endDate - startDate) / (1000 * 60 * 60 * 24)
  )
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function minutesToTime(totalMinutes) {
  const safeMinutes = Math.max(0, Math.min(totalMinutes, 23 * 60 + 59))

  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  return `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}:00`
}

function getPriorityWeight(priority) {
  if (priority === "High") return 3
  if (priority === "Medium") return 2
  return 1
}

function Planner() {
  const [user, setUser] = useState(null)
  const [exams, setExams] = useState([])
  const [selectedExamId, setSelectedExamId] = useState("")

  const [studyHours, setStudyHours] = useState(2)

  const [topics, setTopics] = useState([
    {
      id: crypto.randomUUID(),
      name: "",
      priority: "Medium",
    },
  ])

  const [savedTasks, setSavedTasks] = useState([])

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const selectedExam = useMemo(
    () => exams.find((exam) => exam.id === selectedExamId),
    [exams, selectedExamId]
  )

  const upcomingDays = useMemo(() => {
    if (!selectedExam) return 0

    return Math.max(
      0,
      differenceInDays(new Date(), selectedExam.exam_date)
    )
  }, [selectedExam])

  const loadData = async () => {
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

    const { data: examData, error: examError } = await supabase
      .from("exams")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("exam_date", { ascending: true })
      .order("exam_time", { ascending: true })

    if (examError) {
      console.error(examError)
      setError("Unable to load your exams.")
      setLoading(false)
      return
    }

    const now = new Date()

    const upcomingExams = (examData || []).filter((exam) => {
      const examDateTime = new Date(
        `${exam.exam_date}T${exam.exam_time || "09:00:00"}`
      )

      return examDateTime > now
    })

    setExams(upcomingExams)

    if (upcomingExams.length > 0) {
      setSelectedExamId((current) =>
        current || upcomingExams[0].id
      )
    }

    const { data: taskData, error: taskError } = await supabase
      .from("study_tasks")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("task_date", { ascending: true })
      .order("start_time", { ascending: true })

    if (taskError) {
      console.error(taskError)
      setError("Unable to load your study plan.")
    } else {
      setSavedTasks(taskData || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const updateTopic = (id, field, value) => {
    setTopics((current) =>
      current.map((topic) =>
        topic.id === id
          ? {
              ...topic,
              [field]: value,
            }
          : topic
      )
    )
  }

  const addTopic = () => {
    setTopics((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        priority: "Medium",
      },
    ])
  }

  const removeTopic = (id) => {
    setTopics((current) => {
      if (current.length === 1) return current

      return current.filter((topic) => topic.id !== id)
    })
  }

  const generatePlan = async () => {
    setMessage("")
    setError("")

    if (!user) {
      setError("Please log in first.")
      return
    }

    if (!selectedExam) {
      setError("Select an upcoming exam.")
      return
    }

    const cleanTopics = topics
      .map((topic) => ({
        ...topic,
        name: topic.name.trim(),
      }))
      .filter((topic) => topic.name)

    if (cleanTopics.length === 0) {
      setError("Add at least one topic.")
      return
    }

    const normalizedNames = cleanTopics.map((topic) =>
      topic.name.toLowerCase()
    )

    const hasDuplicates =
      new Set(normalizedNames).size !== normalizedNames.length

    if (hasDuplicates) {
      setError("Each topic should be entered only once.")
      return
    }

    if (studyHours < 1 || studyHours > 6) {
      setError("Study hours must be between 1 and 6 hours.")
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const examDate = new Date(
      `${selectedExam.exam_date}T00:00:00`
    )
    examDate.setHours(0, 0, 0, 0)

    const availableDays = differenceInDays(today, examDate) - 1

    if (availableDays < 1) {
      setError(
        "There is not enough time to create a study plan before this exam."
      )
      return
    }

    setGenerating(true)

    try {
      const { error: deleteError } = await supabase
        .from("study_tasks")
        .delete()
        .eq("user_id", user.id)
        .eq("exam_id", selectedExam.id)

      if (deleteError) {
        throw deleteError
      }

      const dailyMinutes = Number(studyHours) * 60

      const orderedTopics = [...cleanTopics].sort(
        (a, b) =>
          getPriorityWeight(b.priority) -
          getPriorityWeight(a.priority)
      )

      const generatedTasks = []

      const revisionDays = Math.min(2, Math.max(1, availableDays))
      const contentDays = Math.max(
        1,
        availableDays - revisionDays
      )

      /*
       * Main topic sessions.
       * Each day receives ONE topic so the same topic
       * is not repeated multiple times on the same day.
       */
      for (let dayIndex = 0; dayIndex < contentDays; dayIndex++) {
        const studyDate = addDays(today, dayIndex + 1)

        const topic =
          orderedTopics[dayIndex % orderedTopics.length]

        const startMinutes = 17 * 60
        const endMinutes = startMinutes + dailyMinutes

        generatedTasks.push({
          user_id: user.id,
          exam_id: selectedExam.id,
          subject: selectedExam.subject,
          task_title: topic.name,
          task_date: formatDate(studyDate),
          duration_minutes: dailyMinutes,
          priority: topic.priority,
          completed: false,
          start_time: minutesToTime(startMinutes),
          end_time: minutesToTime(endMinutes),
        })
      }

      /*
       * Final revision days.
       */
      for (let revisionIndex = 0; revisionIndex < revisionDays; revisionIndex++) {
        const revisionDate = addDays(
          today,
          contentDays + revisionIndex + 1
        )

        const startMinutes = 17 * 60
        const endMinutes = startMinutes + dailyMinutes

        generatedTasks.push({
          user_id: user.id,
          exam_id: selectedExam.id,
          subject: selectedExam.subject,
          task_title:
            revisionIndex === revisionDays - 1
              ? "Final Revision"
              : "Revision + Practice",
          task_date: formatDate(revisionDate),
          duration_minutes: dailyMinutes,
          priority: "High",
          completed: false,
          start_time: minutesToTime(startMinutes),
          end_time: minutesToTime(endMinutes),
        })
      }

      const { error: insertError } = await supabase
        .from("study_tasks")
        .insert(generatedTasks)

      if (insertError) {
        throw insertError
      }

      setSavedTasks(generatedTasks)

      setMessage(
        `Study plan created with ${generatedTasks.length} scheduled sessions.`
      )
    } catch (err) {
      console.error(err)

      setError(
        err?.message ||
          "Something went wrong while creating your study plan."
      )
    } finally {
      setGenerating(false)
    }
  }

  const deletePlan = async () => {
    if (!user || !selectedExam) return

    const confirmed = window.confirm(
      `Delete the study plan for ${selectedExam.subject}?`
    )

    if (!confirmed) return

    setGenerating(true)
    setMessage("")
    setError("")

    const { error: deleteError } = await supabase
      .from("study_tasks")
      .delete()
      .eq("user_id", user.id)
      .eq("exam_id", selectedExam.id)

    if (deleteError) {
      console.error(deleteError)
      setError("Unable to delete the study plan.")
    } else {
      setSavedTasks((current) =>
        current.filter(
          (task) => task.exam_id !== selectedExam.id
        )
      )

      setMessage("Study plan deleted.")
    }

    setGenerating(false)
  }

  const selectedExamTasks = savedTasks
    .filter((task) => task.exam_id === selectedExamId)
    .sort((a, b) => {
      if (a.task_date !== b.task_date) {
        return a.task_date.localeCompare(b.task_date)
      }

      return (a.start_time || "").localeCompare(
        b.start_time || ""
      )
    })

  const completedCount = selectedExamTasks.filter(
    (task) => task.completed
  ).length

  const progress =
    selectedExamTasks.length > 0
      ? Math.round(
          (completedCount / selectedExamTasks.length) * 100
        )
      : 0

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <div className="text-5xl">📝</div>
          <p className="mt-4 text-sm text-zinc-500">
            Loading planner...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-zinc-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-400">
            StudentHub
          </p>

          <h1 className="mt-2 text-4xl font-black sm:text-5xl">
            Exam Planner
          </h1>

          <p className="mt-3 max-w-2xl text-zinc-400">
            Build a study plan and StudentHub will place your sessions
            directly into your timetable.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/70 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
              Plan setup
            </p>

            <h2 className="mt-2 text-xl font-black">
              Choose your exam
            </h2>

            {exams.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 p-5">
                <p className="font-semibold">
                  No upcoming exams found.
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Add an exam first and then come back here.
                </p>

                <Link
                  to="/exams"
                  className="mt-4 inline-block rounded-xl bg-violet-500 px-4 py-2 text-sm font-bold"
                >
                  Add Exam
                </Link>
              </div>
            ) : (
              <>
                <select
                  value={selectedExamId}
                  onChange={(event) =>
                    setSelectedExamId(event.target.value)
                  }
                  className="mt-4 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500"
                >
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.subject} · {exam.exam_date}
                    </option>
                  ))}
                </select>

                {selectedExam && (
                  <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                    <p className="text-sm text-zinc-500">
                      Exam
                    </p>

                    <p className="mt-1 text-lg font-bold">
                      {selectedExam.subject}
                    </p>

                    <p className="mt-1 text-sm text-violet-300">
                      {selectedExam.exam_date} ·{" "}
                      {selectedExam.exam_time}
                    </p>

                    <p className="mt-3 text-sm text-zinc-400">
                      {upcomingDays} day
                      {upcomingDays === 1 ? "" : "s"} until exam
                    </p>
                  </div>
                )}

                <div className="mt-6">
                  <label className="text-sm font-semibold text-zinc-300">
                    Daily study hours
                  </label>

                  <div className="mt-3 flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="6"
                      step="1"
                      value={studyHours}
                      onChange={(event) =>
                        setStudyHours(Number(event.target.value))
                      }
                      className="w-full accent-violet-500"
                    />

                    <div className="w-20 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-center font-bold">
                      {studyHours}h
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-zinc-600">
                    Sessions are scheduled from 5:00 PM.
                  </p>
                </div>

                <div className="mt-8">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">
                      Topics
                    </h3>

                    <button
                      onClick={addTopic}
                      className="rounded-xl border border-zinc-700 px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-800"
                    >
                      + Add Topic
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {topics.map((topic, index) => (
                      <div
                        key={topic.id}
                        className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
                      >
                        <div className="flex gap-3">
                          <input
                            value={topic.name}
                            onChange={(event) =>
                              updateTopic(
                                topic.id,
                                "name",
                                event.target.value
                              )
                            }
                            placeholder={`Topic ${index + 1}`}
                            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-500"
                          />

                          <select
                            value={topic.priority}
                            onChange={(event) =>
                              updateTopic(
                                topic.id,
                                "priority",
                                event.target.value
                              )
                            }
                            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none"
                          >
                            {PRIORITIES.map((priority) => (
                              <option
                                key={priority}
                                value={priority}
                              >
                                {priority}
                              </option>
                            ))}
                          </select>
                        </div>

                        {topics.length > 1 && (
                          <button
                            onClick={() =>
                              removeTopic(topic.id)
                            }
                            className="mt-3 text-xs font-bold text-red-400 hover:text-red-300"
                          >
                            Remove topic
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
                    {message}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={generatePlan}
                    disabled={generating}
                    className="rounded-2xl bg-violet-500 px-6 py-3 font-bold text-white hover:bg-violet-400 disabled:opacity-50"
                  >
                    {generating
                      ? "Creating..."
                      : "🚀 Generate Study Plan"}
                  </button>

                  <button
                    onClick={deletePlan}
                    disabled={generating || selectedExamTasks.length === 0}
                    className="rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-3 font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-30"
                  >
                    Delete Plan
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/70 p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Generated timetable
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {selectedExam
                    ? selectedExam.subject
                    : "No exam selected"}
                </h2>
              </div>

              {selectedExamTasks.length > 0 && (
                <div className="text-right">
                  <p className="text-2xl font-black">
                    {progress}%
                  </p>
                  <p className="text-xs text-zinc-500">
                    completed
                  </p>
                </div>
              )}
            </div>

            {selectedExamTasks.length === 0 ? (
              <div className="mt-6 flex min-h-[400px] items-center justify-center rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center">
                <div>
                  <div className="text-5xl">🗓️</div>

                  <h3 className="mt-5 text-xl font-bold">
                    No plan yet
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Choose your topics and generate a study plan.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {selectedExamTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-2xl border p-4 ${
                      task.completed
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-zinc-800 bg-zinc-950"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-violet-400">
                          {task.task_date} ·{" "}
                          {task.start_time?.slice(0, 5)} –{" "}
                          {task.end_time?.slice(0, 5)}
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
                      </div>

                      <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-400">
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/schedule"
            className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-3 text-sm font-bold hover:border-violet-500/40"
          >
            📅 View Schedule
          </Link>

          <Link
            to="/dashboard"
            className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-3 text-sm font-bold hover:border-violet-500/40"
          >
            📊 Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}

export default Planner