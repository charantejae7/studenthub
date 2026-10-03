import { Routes, Route } from "react-router-dom"

import Layout from "./components/Layout"
import ProtectedRoute from "./components/ProtectedRoute"

import Home from "./pages/Home"
import Auth from "./pages/Auth"
import Dashboard from "./pages/Dashboard"
import Profile from "./pages/Profile"
import Exams from "./pages/Exams"
import Planner from "./pages/Planner"
import Schedule from "./pages/Schedule"
import PanicMode from "./pages/PanicMode"
import Resources from "./pages/Resources"
import ResourceDetails from "./pages/ResourceDetails"
import Focus from "./pages/Focus"

function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <div className="text-center">
        <div className="text-6xl">🛸</div>

        <h1 className="mt-5 text-4xl font-black">
          Page not found
        </h1>

        <p className="mt-3 text-zinc-500">
          This page does not exist.
        </p>
      </div>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Auth />} />

        <Route path="/resources" element={<Resources />} />
        <Route
          path="/resources/:id"
          element={<ResourceDetails />}
        />

        <Route path="/planner" element={<Planner />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/panic-mode" element={<PanicMode />} />
        <Route path="/focus" element={<Focus />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/exams" element={<Exams />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App