import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { supabase } from "../lib/supabaseClient"

function Exams() {
  // =========================================
  // FORM
  // =========================================
  const [subject, setSubject] = useState("")
  const [examDate, setExamDate] = useState("")
  const [examTime, setExamTime] = useState("09:00")

  // =========================================
  // EXAMS
  // =========================================
  const [exams, setExams] = useState([])

  // =========================================
  // EDITING
  // =========================================
  const [editingId, setEditingId] =
    useState(null)

  // =========================================
  // UI STATE
  // =========================================
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  // =========================================
  // LOAD EXAMS
  // =========================================
  const loadExams = async () => {
    setLoading(true)
    setError("")

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError("You are not logged in.")
      setLoading(false)
      return
    }

    const {
      data,
      error: examsError,
    } = await supabase
      .from("exams")
      .select(
        "id, subject, exam_date, exam_time, created_at"
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

      setError(
        examsError.message
      )
      setLoading(false)
      return
    }

    setExams(data || [])
    setLoading(false)
  }

  // =========================================
  // INITIAL LOAD
  // =========================================
  useEffect(() => {
    loadExams()
  }, [])

  // =========================================
  // RESET FORM
  // =========================================
  const resetForm = () => {
    setSubject("")
    setExamDate("")
    setExamTime("09:00")
    setEditingId(null)
  }

  // =========================================
  // ADD / UPDATE EXAM
  // =========================================
  const handleSubmit = async (
    event
  ) => {
    event.preventDefault()

    setMessage("")
    setError("")

    if (!subject.trim()) {
      setError(
        "Please enter the subject name."
      )
      return
    }

    if (!examDate) {
      setError(
        "Please select the exam date."
      )
      return
    }

    if (!examTime) {
      setError(
        "Please select the exam time."
      )
      return
    }

    // ---------------------------------------
    // PREVENT PAST EXAM
    // ---------------------------------------
    const examDateTime = new Date(
      `${examDate}T${examTime}`
    )

    if (
      examDateTime <=
      new Date()
    ) {
      setError(
        "Please choose a future date and time."
      )
      return
    }

    setSaving(true)

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser()

      if (
        userError ||
        !user
      ) {
        throw new Error(
          "You are not logged in."
        )
      }

      // =====================================
      // UPDATE EXISTING EXAM
      // =====================================
      if (editingId) {
        const {
          error: updateError,
        } = await supabase
          .from("exams")
          .update({
            subject:
              subject.trim(),
            exam_date:
              examDate,
            exam_time:
              examTime,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            editingId
          )
          .eq(
            "user_id",
            user.id
          )

        if (updateError) {
          throw updateError
        }

        setMessage(
          "Exam updated successfully 🎉"
        )
      }

      // =====================================
      // ADD NEW EXAM
      // =====================================
      else {
        const {
          error: insertError,
        } = await supabase
          .from("exams")
          .insert({
            user_id:
              user.id,
            subject:
              subject.trim(),
            exam_date:
              examDate,
            exam_time:
              examTime,
          })

        if (insertError) {
          throw insertError
        }

        setMessage(
          "Exam added successfully 🎉"
        )
      }

      resetForm()
      await loadExams()
    } catch (submitError) {
      console.error(
        "Unable to save exam:",
        submitError
      )

      setError(
        submitError.message ||
          "Unable to save the exam."
      )
    } finally {
      setSaving(false)
    }
  }

  // =========================================
  // START EDIT
  // =========================================
  const handleEdit = (
    exam
  ) => {
    setError("")
    setMessage("")

    setEditingId(
      exam.id
    )

    setSubject(
      exam.subject
    )

    setExamDate(
      exam.exam_date
    )

    setExamTime(
      exam.exam_time?.slice(
        0,
        5
      ) || "09:00"
    )

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  // =========================================
  // DELETE
  // =========================================
  const handleDelete = async (
    examId
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this exam?"
      )

    if (!confirmed) {
      return
    }

    setError("")
    setMessage("")

    const {
      error: deleteError,
    } = await supabase
      .from("exams")
      .delete()
      .eq(
        "id",
        examId
      )

    if (deleteError) {
      console.error(
        "Unable to delete exam:",
        deleteError
      )

      setError(
        deleteError.message
      )
      return
    }

    if (
      editingId ===
      examId
    ) {
      resetForm()
    }

    setMessage(
      "Exam deleted successfully."
    )

    await loadExams()
  }

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

    const [
      hours,
      minutes,
    ] = timeString
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

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">

        {/* =================================
            HEADER
        ================================== */}
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
              My Exams
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              Keep exam day in sight.
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-400">
              Add, edit and manage your upcoming exams.
              StudentHub uses these dates across your
              Planner, Dashboard and Panic Mode.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="w-fit rounded-full border border-zinc-800 px-5 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>

        {/* =================================
            ADD / EDIT CARD
        ================================== */}
        <div
          className={`rounded-[2rem] border p-6 sm:p-8 ${
            editingId
              ? "border-violet-500/30 bg-violet-500/5"
              : "border-zinc-800 bg-zinc-900/60"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
                {editingId
                  ? "Edit exam"
                  : "Add an exam"}
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {editingId
                  ? "Update the exam details."
                  : "What's coming up?"}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                {editingId
                  ? "Make your changes and save them."
                  : "Add your subject, date and exact exam time."}
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={
                  resetForm
                }
                className="w-fit rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-500 transition hover:border-zinc-600 hover:text-white"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-8 grid gap-5 sm:grid-cols-2"
          >
            {/* SUBJECT */}
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                📚 Subject
              </label>

              <input
                type="text"
                value={subject}
                onChange={(
                  event
                ) =>
                  setSubject(
                    event.target
                      .value
                  )
                }
                placeholder="Example: Computer Networks"
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-white outline-none placeholder:text-zinc-700 transition focus:border-violet-500"
              />
            </div>

            {/* DATE */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                📅 Exam date
              </label>

              <input
                type="date"
                value={
                  examDate
                }
                onChange={(
                  event
                ) =>
                  setExamDate(
                    event.target
                      .value
                  )
                }
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-white outline-none transition focus:border-violet-500"
              />
            </div>

            {/* TIME */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                ⏰ Exam time
              </label>

              <input
                type="time"
                value={
                  examTime
                }
                onChange={(
                  event
                ) =>
                  setExamTime(
                    event.target
                      .value
                  )
                }
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-white outline-none transition focus:border-violet-500"
              />
            </div>

            {/* ERROR */}
            {error && (
              <div className="sm:col-span-2 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* MESSAGE */}
            {message && (
              <div className="sm:col-span-2 rounded-2xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-300">
                {message}
              </div>
            )}

            {/* BUTTON */}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={
                  saving
                }
                className="w-full rounded-2xl bg-white py-4 font-bold text-black transition hover:scale-[1.01] hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? editingId
                    ? "Updating exam..."
                    : "Adding exam..."
                  : editingId
                    ? "✓ Update Exam"
                    : "＋ Add Exam"}
              </button>
            </div>
          </form>
        </div>

        {/* =================================
            UPCOMING
        ================================== */}
        <section className="mt-12">

          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
              Your schedule
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Upcoming exams
            </h2>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
              <div className="text-4xl">
                ⏳
              </div>

              <p className="mt-4 text-sm text-zinc-500">
                Loading your exams...
              </p>
            </div>
          ) : exams.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 p-10 text-center">
              <div className="text-5xl">
                🗓️
              </div>

              <h3 className="mt-4 text-xl font-bold">
                No exams added yet.
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                Add your first exam above and StudentHub
                will start counting down.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {exams.map(
                (exam) => {
                  const examDateTime =
                    new Date(
                      `${exam.exam_date}T${exam.exam_time}`
                    )

                  const isFuture =
                    examDateTime >
                    new Date()

                  return (
                    <div
                      key={
                        exam.id
                      }
                      className="group rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 transition hover:border-violet-500/40"
                    >
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                        {/* INFO */}
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-2xl">
                            📚
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold">
                                {
                                  exam.subject
                                }
                              </h3>

                              {isFuture && (
                                <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] uppercase tracking-wide text-green-400">
                                  Upcoming
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-sm text-zinc-500">
                              {formatDate(
                                exam.exam_date
                              )}
                              {" • "}
                              {formatTime(
                                exam.exam_time
                              )}
                            </p>
                          </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                exam
                              )
                            }
                            className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:border-violet-500 hover:bg-violet-500/10 hover:text-violet-300"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                exam.id
                              )
                            }
                            className="rounded-full border border-red-500/20 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          )}
        </section>

        <div className="py-12 text-center">
          <p className="text-sm text-zinc-600">
            One exam at a time. One plan at a time. 🚀
          </p>
        </div>
      </div>
    </main>
  )
}

export default Exams