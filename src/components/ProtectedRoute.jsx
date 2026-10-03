import { useEffect, useState } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

function ProtectedRoute() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser()

      if (error) {
        console.error("Auth check failed:", error)
        setUser(null)
      } else {
        setUser(data.user)
      }

      setChecking(false)
    }

    checkUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Protected route event:", event)

      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <div className="text-4xl">🎓</div>
          <p className="mt-4 text-sm text-zinc-500">
            Checking your session...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute