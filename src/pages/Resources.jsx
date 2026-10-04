import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"

const RESOURCE_TYPES = [
  "Notes",
  "Question Paper",
  "Lab Manual",
  "PPT",
  "Assignment",
  "Textbook",
  "Other",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024

const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "txt",
]

function formatFileSize(bytes) {
  if (!bytes) return "Unknown size"

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateString) {
  if (!dateString) return "Unknown date"

  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getFileIcon(mimeType, fileName = "") {
  const extension =
    fileName.split(".").pop()?.toLowerCase() || ""

  if (mimeType === "application/pdf" || extension === "pdf") {
    return "📕"
  }

  if (
    mimeType?.includes("word") ||
    extension === "doc" ||
    extension === "docx"
  ) {
    return "📘"
  }

  if (
    mimeType?.includes("presentation") ||
    mimeType?.includes("powerpoint") ||
    extension === "ppt" ||
    extension === "pptx"
  ) {
    return "📙"
  }

  if (mimeType === "text/plain" || extension === "txt") {
    return "📄"
  }

  return "📁"
}

function Resources() {
  const [user, setUser] = useState(null)
  const [resources, setResources] = useState([])

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const [search, setSearch] = useState("")
  const [subjectFilter, setSubjectFilter] = useState("All")
  const [typeFilter, setTypeFilter] = useState("All")

  const [showUpload, setShowUpload] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [subject, setSubject] = useState("")
  const [resourceType, setResourceType] = useState("Notes")
  const [file, setFile] = useState(null)

  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const loadResources = async () => {
    setLoading(true)
    setError("")

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    setUser(currentUser)

    const { data, error: resourceError } = await supabase
      .from("resources")
      .select(
        "id, user_id, title, description, subject, resource_type, file_name, file_size, mime_type, downloads, created_at"
      )
      .order("created_at", { ascending: false })

    if (resourceError) {
      console.error("Unable to load resources:", resourceError)
      setError(resourceError.message)
      setResources([])
    } else {
      setResources(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadResources()
  }, [])

  const subjects = useMemo(() => {
    const values = [
      ...new Set(
        resources
          .map((resource) => resource.subject?.trim())
          .filter(Boolean)
      ),
    ]

    return values.sort((a, b) => a.localeCompare(b))
  }, [resources])

  const filteredResources = useMemo(() => {
    const query = search.trim().toLowerCase()

    return resources.filter((resource) => {
      const matchesSearch =
        !query ||
        resource.title?.toLowerCase().includes(query) ||
        resource.description?.toLowerCase().includes(query) ||
        resource.subject?.toLowerCase().includes(query) ||
        resource.file_name?.toLowerCase().includes(query)

      const matchesSubject =
        subjectFilter === "All" ||
        resource.subject === subjectFilter

      const matchesType =
        typeFilter === "All" ||
        resource.resource_type === typeFilter

      return (
        matchesSearch &&
        matchesSubject &&
        matchesType
      )
    })
  }, [
    resources,
    search,
    subjectFilter,
    typeFilter,
  ])

  const resetUploadForm = () => {
    setTitle("")
    setDescription("")
    setSubject("")
    setResourceType("Notes")
    setFile(null)
  }

  const handleFileChange = (event) => {
    setError("")
    setMessage("")

    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      setFile(null)
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("File must be 10 MB or smaller.")
      event.target.value = ""
      setFile(null)
      return
    }

    const extension = selectedFile.name
      .split(".")
      .pop()
      ?.toLowerCase()

    if (
      !extension ||
      !ALLOWED_EXTENSIONS.includes(extension)
    ) {
      setError(
        "Allowed files: PDF, DOC, DOCX, PPT, PPTX and TXT."
      )
      event.target.value = ""
      setFile(null)
      return
    }

    setFile(selectedFile)
  }

  const handleUpload = async (event) => {
    event.preventDefault()

    setError("")
    setMessage("")

    if (!user) {
      setError("Please log in before uploading a resource.")
      return
    }

    if (!title.trim()) {
      setError("Please enter a resource title.")
      return
    }

    if (!subject.trim()) {
      setError("Please enter the subject.")
      return
    }

    if (!file) {
      setError("Please select a file.")
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File must be 10 MB or smaller.")
      return
    }

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase()

    if (
      !extension ||
      !ALLOWED_EXTENSIONS.includes(extension)
    ) {
      setError(
        "Allowed files: PDF, DOC, DOCX, PPT, PPTX and TXT."
      )
      return
    }

    setUploading(true)

    let uploadedPath = ""

    try {
      const safeFileName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, "_")

      uploadedPath = `${user.id}/${crypto.randomUUID()}-${safeFileName}`

      const {
        error: uploadError,
      } = await supabase.storage
        .from("resource-files")
        .upload(uploadedPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })

      if (uploadError) {
        throw uploadError
      }

      const {
        data: insertedResource,
        error: insertError,
      } = await supabase
        .from("resources")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          subject: subject.trim(),
          resource_type: resourceType,
          file_name: file.name,
          file_path: uploadedPath,
          file_size: file.size,
          mime_type: file.type || "application/octet-stream",
          downloads: 0,
        })
        .select(
          "id, user_id, title, description, subject, resource_type, file_name, file_size, mime_type, downloads, created_at"
        )
        .single()

      if (insertError) {
        await supabase.storage
          .from("resource-files")
          .remove([uploadedPath])

        throw insertError
      }

      setResources((current) => [
        insertedResource,
        ...current,
      ])

      resetUploadForm()
      setShowUpload(false)
      setMessage("Resource uploaded successfully.")
    } catch (uploadError) {
      console.error(
        "Unable to upload resource:",
        uploadError
      )

      setError(
        uploadError?.message ||
          "Unable to upload the resource."
      )
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-zinc-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-12 text-center">
            <div className="text-5xl">📚</div>

            <p className="mt-4 text-sm text-zinc-500">
              Loading resources...
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-zinc-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}

        <section className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-400">
                StudentHub
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                Resource Hub
              </h1>

              <p className="mt-3 max-w-2xl text-zinc-400">
                Find notes, question papers, lab manuals and study
                material shared by students.
              </p>
            </div>

            {user ? (
              <button
                type="button"
                onClick={() => {
                  setShowUpload((current) => !current)
                  setError("")
                  setMessage("")
                }}
                className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-400"
              >
                {showUpload
                  ? "✕ Close Upload"
                  : "＋ Upload Resource"}
              </button>
            ) : (
              <Link
                to="/login"
                className="rounded-2xl bg-violet-500 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-violet-400"
              >
                Login to Upload
              </Link>
            )}
          </div>
        </section>

        {/* Messages */}

        {(error || message) && (
          <section className="mb-6">
            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">
                {message}
              </div>
            )}
          </section>
        )}

        {/* Upload form */}

        {showUpload && user && (
          <section className="mb-8 rounded-[2rem] border border-violet-500/20 bg-violet-500/5 p-5 sm:p-7">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
                Share with students
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Upload a Resource
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Maximum file size is 10 MB. Supported formats:
                PDF, DOC, DOCX, PPT, PPTX and TXT.
              </p>
            </div>

            <form
              onSubmit={handleUpload}
              className="grid gap-5 lg:grid-cols-2"
            >
              <div>
                <label className="text-sm font-semibold text-zinc-300">
                  Title
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="Example: Computer Networks Unit 1 Notes"
                  className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-zinc-300">
                  Subject
                </label>

                <input
                  type="text"
                  value={subject}
                  onChange={(event) =>
                    setSubject(event.target.value)
                  }
                  placeholder="Example: Computer Networks"
                  className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-zinc-300">
                  Resource Type
                </label>

                <select
                  value={resourceType}
                  onChange={(event) =>
                    setResourceType(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-violet-500"
                >
                  {RESOURCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-zinc-300">
                  File
                </label>

                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                  onChange={handleFileChange}
                  className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-400 file:mr-4 file:rounded-xl file:border-0 file:bg-violet-500 file:px-4 file:py-2 file:font-bold file:text-white"
                />

                {file && (
                  <p className="mt-2 text-xs text-zinc-500">
                    {file.name} · {formatFileSize(file.size)}
                  </p>
                )}
              </div>

              <div className="lg:col-span-2">
                <label className="text-sm font-semibold text-zinc-300">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  rows={4}
                  placeholder="Add a short description..."
                  className="mt-2 w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                />
              </div>

              <div className="lg:col-span-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-2xl bg-white px-6 py-3 font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading
                    ? "Uploading..."
                    : "🚀 Upload Resource"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Search + filters */}

        <section className="mb-8 rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="🔎 Search resources, subjects or files..."
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
            />

            <select
              value={subjectFilter}
              onChange={(event) =>
                setSubjectFilter(event.target.value)
              }
              className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none"
            >
              <option value="All">All Subjects</option>

              {subjects.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value)
              }
              className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none"
            >
              <option value="All">All Types</option>

              {RESOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 text-sm text-zinc-500">
            Showing{" "}
            <span className="font-bold text-zinc-300">
              {filteredResources.length}
            </span>{" "}
            resource
            {filteredResources.length === 1 ? "" : "s"}
          </div>
        </section>

        {/* Resource list */}

        {filteredResources.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-zinc-700 bg-zinc-900/30 p-12 text-center">
            <div className="text-6xl">📭</div>

            <h2 className="mt-5 text-2xl font-black">
              No resources found
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-500">
              Try another search or filter, or upload the first
              resource for your classmates.
            </p>
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredResources.map((resource) => (
              <Link
                key={resource.id}
                to={`/resources/${resource.id}`}
                className="group rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-3xl">
                    {getFileIcon(
                      resource.mime_type,
                      resource.file_name
                    )}
                  </div>

                  <span className="rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-300">
                    {resource.resource_type}
                  </span>
                </div>

                <h2 className="mt-5 line-clamp-2 text-xl font-black transition group-hover:text-violet-300">
                  {resource.title}
                </h2>

                <p className="mt-2 text-sm font-semibold text-violet-400">
                  📚 {resource.subject}
                </p>

                {resource.description && (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-500">
                    {resource.description}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-3 text-xs text-zinc-600">
                  <span>
                    📄 {resource.file_name}
                  </span>

                  <span>
                    💾 {formatFileSize(resource.file_size)}
                  </span>

                  <span>
                    ⬇ {resource.downloads || 0}
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-4">
                  <span className="text-xs text-zinc-600">
                    {formatDate(resource.created_at)}
                  </span>

                  <span className="text-sm font-bold text-zinc-300 transition group-hover:text-white">
                    View →
                  </span>
                </div>
              </Link>
            ))}
          </section>
        )}

        <div className="py-12 text-center">
          <p className="text-sm text-zinc-600">
            Share knowledge. Save someone from tomorrow's panic. 🚀
          </p>
        </div>
      </div>
    </main>
  )
}

export default Resources