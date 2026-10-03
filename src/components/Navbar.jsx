import { useEffect, useState } from "react"
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [profileName, setProfileName] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)

  const loadUser = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    setUser(currentUser)

    if (!currentUser) {
      setProfileName("")
      return
    }

    const { data } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", currentUser.id)
      .maybeSingle()

    setProfileName(data?.name || currentUser.email || "")
  }

  useEffect(() => {
    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const logout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  const publicLinks = [
    {
      label: "Resources",
      path: "/resources",
    },
    {
      label: "Planner",
      path: "/planner",
    },
    {
      label: "Schedule",
      path: "/schedule",
    },
    {
      label: "Focus",
      path: "/focus",
    },
    {
      label: "Panic Mode",
      path: "/panic-mode",
    },
  ]

  const privateLinks = [
    {
      label: "Dashboard",
      path: "/dashboard",
    },
    {
      label: "My Exams",
      path: "/exams",
    },
    {
      label: "Profile",
      path: "/profile",
    },
  ]

  const links = user
    ? [...privateLinks, ...publicLinks]
    : publicLinks

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/"
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    )
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/70 bg-zinc-950/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}

        <Link
          to="/"
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500 text-lg shadow-lg shadow-violet-500/20">
            🎓
          </div>

          <div>
            <p className="text-lg font-black tracking-tight">
              StudentHub
            </p>

            <p className="hidden text-[10px] uppercase tracking-[0.2em] text-zinc-600 sm:block">
              Study smarter
            </p>
          </div>
        </Link>

        {/* Desktop navigation */}

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                isActive(link.path)
                  ? "bg-violet-500/10 text-violet-300"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop profile */}

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <div className="max-w-40 truncate rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-400">
                {profileName || "Student"}
              </div>

              <button
                onClick={logout}
                className="rounded-xl border border-zinc-800 px-3 py-2 text-xs font-bold text-zinc-400 hover:border-red-500/30 hover:text-red-300"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-bold text-white hover:bg-violet-400"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile button */}

        <button
          onClick={() => setMobileOpen((current) => !current)}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xl lg:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile menu */}

      {mobileOpen && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-4 lg:hidden">
          <nav className="space-y-2">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block rounded-xl px-4 py-3 text-sm font-semibold ${
                  isActive(link.path)
                    ? "bg-violet-500/10 text-violet-300"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {user ? (
              <button
                onClick={logout}
                className="w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-left text-sm font-bold text-red-300"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="block rounded-xl bg-violet-500 px-4 py-3 text-center text-sm font-bold text-white"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export default Navbar