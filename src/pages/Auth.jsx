import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

function Auth() {
  const navigate = useNavigate()

  const [isLogin, setIsLogin] = useState(true)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    setMessage("")
    setLoading(true)

    try {
      if (isLogin) {
        // -----------------------------
        // LOGIN
        // -----------------------------
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setMessage(error.message)
          return
        }

        // Login successful
        navigate("/dashboard")
      } else {
        // -----------------------------
        // SIGN UP
        // -----------------------------
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
            },
          },
        })

        if (error) {
          setMessage(error.message)
          return
        }

        // If Supabase immediately creates a session
        if (data.session) {
          navigate("/dashboard")
        } else {
          setMessage(
            "Account created successfully! Please check your email to confirm your account."
          )
        }
      }
    } catch (error) {
      setMessage("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-[calc(100vh-88px)] items-center justify-center overflow-hidden bg-zinc-950 px-6 py-12 text-white">

      {/* Background glow */}
      <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-900/70 shadow-2xl backdrop-blur-xl md:grid-cols-2">

        {/* LEFT SIDE */}
        <div className="hidden bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-transparent p-10 md:flex md:flex-col md:justify-between">

          <div>

            <Link
              to="/"
              className="text-2xl font-black tracking-tight"
            >
              Student<span className="text-violet-400">Hub</span>
            </Link>

            <div className="mt-20">

              <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
                Your student space
              </p>

              <h1 className="mt-4 text-5xl font-black leading-tight">
                Study less
                <br />
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                  chaotically.
                </span>
              </h1>

              <p className="mt-6 max-w-md leading-7 text-zinc-400">
                Keep your resources, exams, study plans and
                last-minute rescue mode in one place.
              </p>

            </div>

          </div>

          <p className="text-sm text-zinc-600">
            Built for students. Made for exam season. 🚀
          </p>

        </div>


        {/* RIGHT SIDE */}
        <div className="p-7 sm:p-10">

          {/* Mobile logo */}
          <div className="mb-8 md:hidden">
            <Link
              to="/"
              className="text-2xl font-black"
            >
              Student<span className="text-violet-400">Hub</span>
            </Link>
          </div>


          {/* Heading */}
          <div>

            <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
              {isLogin ? "Welcome back" : "Join StudentHub"}
            </p>

            <h2 className="mt-2 text-3xl font-black">
              {isLogin
                ? "Let's get you back in."
                : "Create your account."}
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              {isLogin
                ? "Your exams and plans are waiting."
                : "Set up your student space in a minute."}
            </p>

          </div>


          {/* LOGIN / SIGN UP SWITCH */}
          <div className="mt-7 grid grid-cols-2 rounded-2xl bg-zinc-950 p-1">

            <button
              type="button"
              onClick={() => {
                setIsLogin(true)
                setMessage("")
              }}
              className={`rounded-xl py-2.5 text-sm font-medium transition ${
                isLogin
                  ? "bg-white text-black"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setIsLogin(false)
                setMessage("")
              }}
              className={`rounded-xl py-2.5 text-sm font-medium transition ${
                !isLogin
                  ? "bg-white text-black"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              Sign Up
            </button>

          </div>


          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="mt-7 space-y-5"
          >

            {/* NAME */}
            {!isLogin && (
              <div>

                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Your name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Charan"
                  required
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-white outline-none placeholder:text-zinc-700 transition focus:border-violet-500"
                />

              </div>
            )}


            {/* EMAIL */}
            <div>

              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                required
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-white outline-none placeholder:text-zinc-700 transition focus:border-violet-500"
              />

            </div>


            {/* PASSWORD */}
            <div>

              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-white outline-none placeholder:text-zinc-700 transition focus:border-violet-500"
              />

            </div>


            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-white py-3.5 font-bold text-black transition duration-300 hover:scale-[1.01] hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Continue →"
                  : "Create my account →"}
            </button>

          </form>


          {/* MESSAGE */}
          {message && (
            <div className="mt-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-sm text-violet-300">
              {message}
            </div>
          )}


          <p className="mt-7 text-center text-xs leading-5 text-zinc-600">
            By continuing, you agree to StudentHub's
            terms and privacy policy.
          </p>

        </div>

      </div>

    </main>
  )
}

export default Auth