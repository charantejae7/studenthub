import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { supabase } from "../lib/supabaseClient"

function Profile() {
  // =========================================
  // USER
  // =========================================
  const [user, setUser] = useState(null)

  // =========================================
  // PROFILE FORM
  // =========================================
  const [name, setName] = useState("")
  const [college, setCollege] = useState("")
  const [course, setCourse] = useState("")
  const [semester, setSemester] = useState("")
  const [year, setYear] = useState("")

  // =========================================
  // UI STATE
  // =========================================
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  // =========================================
  // LOAD USER + PROFILE
  // =========================================
  useEffect(() => {
    const loadProfile = async () => {
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

      setUser(user)

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "name, college, course, semester, year"
        )
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        console.error(
          "Unable to load profile:",
          profileError
        )

        setError(profileError.message)
        setLoading(false)
        return
      }

      setName(
        profile?.name ||
          user.user_metadata?.name ||
          ""
      )

      setCollege(
        profile?.college || ""
      )

      setCourse(
        profile?.course || ""
      )

      setSemester(
        profile?.semester
          ? String(profile.semester)
          : ""
      )

      setYear(
        profile?.year
          ? String(profile.year)
          : ""
      )

      setLoading(false)
    }

    loadProfile()
  }, [])

  // =========================================
  // PROFILE COMPLETION
  // =========================================
  const completion = useMemo(() => {
    const fields = [
      name,
      college,
      course,
      semester,
      year,
    ]

    const completed = fields.filter(
      (value) => String(value).trim() !== ""
    ).length

    return Math.round(
      (completed / fields.length) * 100
    )
  }, [
    name,
    college,
    course,
    semester,
    year,
  ])

  // =========================================
  // SEMESTER LABEL
  // =========================================
  const semesterLabel = (value) => {
    if (value === "1") return "1st Semester"
    if (value === "2") return "2nd Semester"
    if (value === "3") return "3rd Semester"

    if (value) {
      return `${value}th Semester`
    }

    return ""
  }

  // =========================================
  // SAVE PROFILE
  // =========================================
  const handleSave = async (event) => {
    event.preventDefault()

    setError("")
    setMessage("")

    if (!user) {
      setError(
        "You are not logged in."
      )
      return
    }

    if (!name.trim()) {
      setError(
        "Please enter your name."
      )
      return
    }

    if (!semester) {
      setError(
        "Please select your semester."
      )
      return
    }

    if (!year) {
      setError(
        "Please select your academic year."
      )
      return
    }

    setSaving(true)

    try {
      const {
        error: profileError,
      } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            name: name.trim(),
            college:
              college.trim() || null,
            course:
              course.trim() || null,
            semester:
              Number(semester),
            year:
              Number(year),
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "id",
          }
        )

      if (profileError) {
        throw profileError
      }

      setMessage(
        "Profile updated successfully 🎉"
      )
    } catch (saveError) {
      console.error(
        "Unable to save profile:",
        saveError
      )

      setError(
        saveError.message ||
          "Unable to update your profile."
      )
    } finally {
      setSaving(false)
    }
  }

  // =========================================
  // LOGOUT
  // =========================================
  const handleLogout = async () => {
    const { error } =
      await supabase.auth.signOut({
        scope: "local",
      })

    if (error) {
      console.error(
        "Logout failed:",
        error
      )

      setError(error.message)
      return
    }

    window.location.replace("/login")
  }

  // =========================================
  // LOADING
  // =========================================
  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-12 text-center">
            <div className="text-5xl">
              ⏳
            </div>

            <p className="mt-4 text-sm text-zinc-500">
              Loading your profile...
            </p>
          </div>
        </div>
      </main>
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
              Account
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              Your Profile
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-400">
              Keep your student information updated so
              StudentHub can personalize your experience.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="w-fit rounded-full border border-zinc-800 px-5 py-2 text-sm text-zinc-400 transition hover:border-violet-500/40 hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">

          {/* =================================
              PROFILE SUMMARY
          ================================== */}
          <div className="space-y-6">

            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-7">

              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-3xl">
                  🎓
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-black">
                    {name || "Student"}
                  </h2>

                  <p className="mt-1 truncate text-sm text-zinc-500">
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="mt-7">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-widest text-zinc-600">
                    Profile completion
                  </p>

                  <span className="text-sm font-bold text-violet-400">
                    {completion}%
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-500"
                    style={{
                      width: `${completion}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ACADEMIC SNAPSHOT */}
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-7">

              <p className="text-sm uppercase tracking-widest text-violet-400">
                Academic Snapshot
              </p>

              <div className="mt-6 space-y-4">

                <div className="rounded-2xl bg-zinc-950/60 p-4">
                  <p className="text-xs text-zinc-600">
                    College
                  </p>

                  <p className="mt-1 font-medium">
                    {college ||
                      "Not added yet"}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-950/60 p-4">
                  <p className="text-xs text-zinc-600">
                    Course
                  </p>

                  <p className="mt-1 font-medium">
                    {course ||
                      "Not added yet"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">

                  <div className="rounded-2xl bg-zinc-950/60 p-4">
                    <p className="text-xs text-zinc-600">
                      Semester
                    </p>

                    <p className="mt-1 font-medium">
                      {semester
                        ? semesterLabel(
                            semester
                          )
                        : "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-zinc-950/60 p-4">
                    <p className="text-xs text-zinc-600">
                      Academic Year
                    </p>

                    <p className="mt-1 font-medium">
                      {year
                        ? `${year} Year`
                        : "—"}
                    </p>
                  </div>

                </div>
              </div>
            </div>

            {/* ACCOUNT */}
            <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-7">

              <p className="text-sm uppercase tracking-widest text-violet-400">
                Account
              </p>

              <p className="mt-4 text-sm text-zinc-500">
                Signed in as
              </p>

              <p className="mt-1 break-all text-sm font-medium text-zinc-300">
                {user?.email}
              </p>

              <button
                type="button"
                onClick={
                  handleLogout
                }
                className="mt-6 w-full rounded-2xl border border-red-500/20 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
              >
                Logout
              </button>
            </div>
          </div>

          {/* =================================
              EDIT PROFILE
          ================================== */}
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-7 sm:p-8">

            <div>
              <p className="text-sm uppercase tracking-widest text-violet-400">
                Student information
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Update your details
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                These details appear across your StudentHub
                experience.
              </p>
            </div>

            <form
              onSubmit={
                handleSave
              }
              className="mt-8 space-y-5"
            >

              {/* NAME */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  👤 Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(
                    event
                  ) =>
                    setName(
                      event.target
                        .value
                    )
                  }
                  placeholder="Your name"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-white outline-none placeholder:text-zinc-700 transition focus:border-violet-500"
                />
              </div>

              {/* COLLEGE */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  🏫 College
                </label>

                <input
                  type="text"
                  value={college}
                  onChange={(
                    event
                  ) =>
                    setCollege(
                      event.target
                        .value
                    )
                  }
                  placeholder="Example: SSMRV College"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-white outline-none placeholder:text-zinc-700 transition focus:border-violet-500"
                />
              </div>

              {/* COURSE */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  💻 Course
                </label>

                <input
                  type="text"
                  value={course}
                  onChange={(
                    event
                  ) =>
                    setCourse(
                      event.target
                        .value
                    )
                  }
                  placeholder="Example: BCA — Cybersecurity & Cloud Architecture"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-white outline-none placeholder:text-zinc-700 transition focus:border-violet-500"
                />
              </div>

              {/* SEMESTER + YEAR */}
              <div className="grid gap-5 sm:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    📚 Semester
                  </label>

                  <select
                    value={
                      semester
                    }
                    onChange={(
                      event
                    ) =>
                      setSemester(
                        event
                          .target
                          .value
                      )
                    }
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-white outline-none transition focus:border-violet-500"
                  >
                    <option value="">
                      Select semester
                    </option>

                    <option value="1">
                      1st Semester
                    </option>

                    <option value="2">
                      2nd Semester
                    </option>

                    <option value="3">
                      3rd Semester
                    </option>

                    <option value="4">
                      4th Semester
                    </option>

                    <option value="5">
                      5th Semester
                    </option>

                    <option value="6">
                      6th Semester
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    🎓 Year
                  </label>

                  <select
                    value={
                      year
                    }
                    onChange={(
                      event
                    ) =>
                      setYear(
                        event
                          .target
                          .value
                      )
                    }
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-white outline-none transition focus:border-violet-500"
                  >
                    <option value="">
                      Select year
                    </option>

                    <option value="1">
                      1st Year
                    </option>

                    <option value="2">
                      2nd Year
                    </option>

                    <option value="3">
                      3rd Year
                    </option>
                  </select>
                </div>

              </div>

              {/* MESSAGE */}
              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-2xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-300">
                  {message}
                </div>
              )}

              {/* SAVE */}
              <button
                type="submit"
                disabled={
                  saving
                }
                className="w-full rounded-2xl bg-white py-4 font-bold text-black transition hover:scale-[1.01] hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving profile..."
                  : "✓ Save Profile"}
              </button>

            </form>
          </div>
        </div>

        <div className="py-12 text-center">
          <p className="text-sm text-zinc-600">
            Your profile. Your exams. Your StudentHub. 🚀
          </p>
        </div>
      </div>
    </main>
  )
}

export default Profile