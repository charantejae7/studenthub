import { Outlet } from "react-router-dom"
import Navbar from "./Navbar"

function Layout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <Outlet />
    </div>
  )
}

export default Layout