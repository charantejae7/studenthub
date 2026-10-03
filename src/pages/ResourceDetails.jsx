import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { supabase } from "../lib/supabaseClient"

function ResourceDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [resource, setResource] = useState(null)
  const [signedUrl, setSignedUrl] = useState("")

  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  // =========================================
  // LOAD USER + RESOURCE
  // =========================================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError("")

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setUser(null)
        setLoading(false)
        return
      }

      setUser(user)

      const {
        data,
        error: resourceError,
      } = await supabase
        .from("resources")
        .select(
          "id, user_id, title, description, subject, resource_type, file_name, file_path, file_size, mime_type, downloads, created_at"
        )
        .eq("id", id)
        .maybeSingle()

      if (resourceError) {
        console.error(
          "Unable to load resource:",
          resourceError
        )

        setError(resourceError.message)
        setLoading(false)
        return
      }

      if (!data) {
        setError("Resource not found.")
        setLoading(false)
        return
      }

      setResource(data)

      // Create a temporary URL for PDF preview
      if (
        data.mime_type ===
        "application/pdf"
      ) {
        const {
          data: signedData,
          error: signedError,
        } = await supabase.storage
          .from("resource-files")
          .createSignedUrl(
            data.file_path,
            60 * 10
          )

        if (!signedError) {
          setSignedUrl(
            signedData?.signedUrl || ""
          )
        }
      }

      setLoading(false)
    }

    loadData()
  }, [id])

  // =========================================
  // FORMAT FILE SIZE
  // =========================================
  const formatFileSize = (bytes) => {
    if (!bytes) {
      return "Unknown size"
    }

    if (bytes < 1024) {
      return `${bytes} B`
    }

    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`
  }

  // =========================================
  // FORMAT DATE
  // =========================================
  const formatDate = (dateString) => {
    const date = new Date(dateString)

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    )
  }

  // =========================================
  // FILE ICON
  // =========================================
  const getFileIcon = (mimeType) => {
    if (
      mimeType ===
      "application/pdf"
    ) {
      return "📕"
    }

    if (mimeType?.includes("word")) {
      return "📘"
    }

    if (
      mimeType?.includes(
        "presentation"
      ) ||
      mimeType?.includes(
        "powerpoint"
      )
    ) {
      return "📙"
    }

    if (
      mimeType ===
      "text/plain"
    ) {
      return "📄"
    }

    return "📁"
  }

  // =========================================
  // DOWNLOAD
  // =========================================
  const handleDownload = async () => {
    if (!resource) {
      return
    }

    setError("")
    setMessage("")
    setDownloading(true)

    try {
      const {
        data,
        error: signedUrlError,
      } = await supabase.storage
        .from("resource-files")
        .createSignedUrl(
          resource.file_path,
          60 * 5
        )

      if (signedUrlError) {
        throw signedUrlError
      }

      if (!data?.signedUrl) {
        throw new Error(
          "Unable to create a download link."
        )
      }

      // Increment download count
      const {
        error: counterError,
      } = await supabase.rpc(
        "increment_resource_download",
        {
          resource_id:
            resource.id,
        }
      )

      if (counterError) {
        console.error(
          "Unable to update download count:",
          counterError
        )
      } else {
        setResource(
          (current) =>
            current
              ? {
                  ...current,
                  downloads:
                    current.downloads +
                    1,
                }
              : current
        )
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      )
    } catch (downloadError) {
      console.error(
        "Unable to download:",
        downloadError
      )

      setError(
        downloadError.message ||
          "Unable to download the file."
      )
    } finally {
      setDownloading(false)
    }
  }

  // =========================================
  // DELETE
  // =========================================
  const handleDelete = async () => {
    if (!resource || !user) {
      return
    }

    if (
      resource.user_id !==
      user.id
    ) {
      setError(
        "You can only delete your own resources."
      )
      return
    }

    const confirmed =
      window.confirm(
        `Delete "${resource.title}"?`
      )

    if (!confirmed) {
      return
    }

    setError("")
    setMessage("")
    setDeleting(true)

    try {
      const {
        error: storageError,
      } = await supabase.storage
        .from("resource-files")
        .remove([
          resource.file_path,
        ])

      if (storageError) {
        throw storageError
      }

      const {
        error: databaseError,
      } = await supabase
        .from("resources")
        .delete()
        .eq(
          "id",
          resource.id
        )
        .eq(
          "user_id",
          user.id
        )

      if (databaseError) {
        throw databaseError
      }

      navigate(
        "/resources",
        {
          replace: true,
        }
      )
    } catch (deleteError) {
      console.error(
        "Unable to delete:",
        deleteError
      )

      setError(
        deleteError.message ||
          "Unable to delete the resource."
      )
    } finally {
      setDeleting(false)
    }
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
              Loading resource...
            </p>
          </div>
        </div>
      </main>
    )
  }

  // =========================================
  // LOGIN REQUIRED
  // =========================================
  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] border border-violet-500/20 bg-violet-500/5 p-10 text-center">
            <div className="text-5xl">
              🔐
            </div>

            <h1 className="mt-5 text-3xl font-black">
              Login required
            </h1>

            <p className="mx-auto mt-3 max-w-lg text-zinc-500">
              Log in to view and download StudentHub
              resources.
            </p>

            <div className="mt-7 flex justify-center gap-3">
              <Link
                to="/login"
                className="rounded-full bg-white px-6 py-3 font-bold text-black transition hover:bg-zinc-200"
              >
                Login →
              </Link>

              <Link
                to="/resources"
                className="rounded-full border border-zinc-700 px-6 py-3 text-sm text-zinc-400 transition hover:text-white"
              >
                Resources
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // =========================================
  // RESOURCE NOT FOUND
  // =========================================
  if (!resource) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-10 text-center">
            <div className="text-5xl">
              📭
            </div>

            <h1 className="mt-5 text-3xl font-black">
              Resource not found
            </h1>

            <p className="mt-3 text-zinc-500">
              This resource may have been deleted.
            </p>

            <Link
              to="/resources"
              className="mt-7 inline-block rounded-full bg-white px-6 py-3 font-bold text-black"
            >
              ← Back to Resources
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">

        {/* =================================
            BACK
        ================================== */}
        <Link
          to="/resources"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Back to Resources
        </Link>

        {/* =================================
            MAIN CARD
        ================================== */}
        <section className="mt-6 rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">

          {/* TOP */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">

            <div className="flex gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-3xl">
                {getFileIcon(
                  resource.mime_type
                )}
              </div>

              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-violet-500/10 px-3 py-1 text-[10px] uppercase tracking-wide text-violet-300">
                    {resource.resource_type}
                  </span>

                  <span className="rounded-full bg-zinc-800 px-3 py-1 text-[10px] uppercase tracking-wide text-zinc-500">
                    {resource.file_name
                      .split(".")
                      .pop()
                      ?.toUpperCase() ||
                      "FILE"}
                  </span>
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  {resource.title}
                </h1>

                <p className="mt-2 text-violet-400">
                  📚 {resource.subject}
                </p>
              </div>
            </div>

            <div className="text-sm text-zinc-600 sm:text-right">
              <p>
                Uploaded{" "}
                {formatDate(
                  resource.created_at
                )}
              </p>

              <p className="mt-1">
                ⬇️{" "}
                {resource.downloads} downloads
              </p>
            </div>
          </div>

          {/* DESCRIPTION */}
          {resource.description && (
            <div className="mt-8 rounded-2xl bg-zinc-950/60 p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-600">
                Description
              </p>

              <p className="mt-3 leading-7 text-zinc-400">
                {resource.description}
              </p>
            </div>
          )}

          {/* FILE INFO */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-600">
                File
              </p>

              <p className="mt-2 truncate font-medium text-zinc-300">
                {resource.file_name}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-600">
                Size
              </p>

              <p className="mt-2 font-medium text-zinc-300">
                {formatFileSize(
                  resource.file_size
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-600">
                Format
              </p>

              <p className="mt-2 font-medium text-zinc-300">
                {resource.mime_type ||
                  "Unknown"}
              </p>
            </div>
          </div>

          {/* PDF PREVIEW */}
          {resource.mime_type ===
            "application/pdf" && (
            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-widest text-violet-400">
                    Preview
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Read it here
                  </h2>
                </div>
              </div>

              {signedUrl ? (
                <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
                  <iframe
                    src={signedUrl}
                    title={
                      resource.title
                    }
                    className="h-[70vh] min-h-[500px] w-full"
                  />
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-zinc-800 p-8 text-center">
                  <p className="text-zinc-500">
                    PDF preview is unavailable.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* NON-PDF */}
          {resource.mime_type !==
            "application/pdf" && (
            <div className="mt-8 rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/30 p-8 text-center">
              <div className="text-5xl">
                {getFileIcon(
                  resource.mime_type
                )}
              </div>

              <h3 className="mt-4 text-xl font-bold">
                Preview isn't available for this file type.
              </h3>

              <p className="mt-2 text-sm text-zinc-600">
                Download the file to open it with the appropriate app.
              </p>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* SUCCESS */}
          {message && (
            <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-300">
              {message}
            </div>
          )}

          {/* ACTIONS */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">

            <button
              type="button"
              onClick={
                handleDownload
              }
              disabled={
                downloading
              }
              className="flex-1 rounded-2xl bg-white px-6 py-4 font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading
                ? "Opening..."
                : "⬇ Download Resource"}
            </button>

            {resource.user_id ===
              user.id && (
              <button
                type="button"
                onClick={
                  handleDelete
                }
                disabled={
                  deleting
                }
                className="rounded-2xl border border-red-500/20 px-6 py-4 font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                {deleting
                  ? "Deleting..."
                  : "Delete Resource"}
              </button>
            )}
          </div>
        </section>

        <div className="py-12 text-center">
          <p className="text-sm text-zinc-600">
            Share knowledge. Save someone from tomorrow's panic. 🚀
          </p>
        </div>
      </div>
    </main>
  )
}

export default ResourceDetails