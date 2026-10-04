import { useEffect, useMemo, useRef, useState } from "react"
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
  "py",
  "sql",
  "java",
  "c",
  "cpp",
  "js",
  "pkt",
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

function getExtension(fileName = "") {
  return fileName.split(".").pop()?.toLowerCase() || ""
}

function getFileIcon(mimeType, fileName = "") {
  const extension = getExtension(fileName)

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

  if (
    mimeType === "text/plain" ||
    ["txt", "py", "sql", "java", "c", "cpp", "js"].includes(extension)
  ) {
    return "📄"
  }

  if (extension === "pkt") {
    return "🌐"
  }

  return "📁"
}

function cleanTitle(fileName = "") {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function detectSubject(file) {
  const relativePath = file.webkitRelativePath || ""

  const parts = relativePath
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length < 2) {
    return ""
  }

  const ignored = new Set([
    "bca",
    "bca general",
    "semester",
    "3rd semester",
    "third semester",
    "iii",
    "resources",
    "resource library",
    "notes",
    "note",
    "lab",
    "labs",
    "practical",
    "practicals",
    "question paper",
    "question papers",
    "pyq",
    "assignment",
    "assignments",
    "ppt",
    "ppts",
    "presentation",
    "presentations",
    "slides",
    "textbook",
    "textbooks",
    "unit 1",
    "unit 2",
    "unit 3",
    "unit 4",
  ])

  const folderParts = parts.slice(0, -1)

  const subjectFolder = folderParts.find((folder) => {
    const normalized = folder
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    return !ignored.has(normalized)
  })

  return subjectFolder || ""
}

function detectResourceType(file) {
  const path = (file.webkitRelativePath || "").toLowerCase()

  if (
    path.includes("question paper") ||
    path.includes("question-papers") ||
    path.includes("pyq")
  ) {
    return "Question Paper"
  }

  if (path.includes("lab") || path.includes("practical")) {
    return "Lab Manual"
  }

  if (
    path.includes("ppt") ||
    path.includes("presentation") ||
    path.includes("slides")
  ) {
    return "PPT"
  }

  if (path.includes("assignment")) {
    return "Assignment"
  }

  if (path.includes("textbook") || path.includes("book")) {
    return "Textbook"
  }

  return "Notes"
}

function getMimeType(file) {
  const types = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    py: "text/x-python",
    sql: "application/sql",
    java: "text/x-java-source",
    c: "text/x-c",
    cpp: "text/x-c++src",
    js: "text/javascript",
    pkt: "application/octet-stream",
  }

  return file.type || types[getExtension(file.name)] || "application/octet-stream"
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

  const [files, setFiles] = useState([])
  const [defaultSubject, setDefaultSubject] = useState("")
  const [resourceType, setResourceType] = useState("Notes")
  const [description, setDescription] = useState("")

  const [uploadProgress, setUploadProgress] = useState({
    completed: 0,
    total: 0,
  })

  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)

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

      return matchesSearch && matchesSubject && matchesType
    })
  }, [resources, search, subjectFilter, typeFilter])

  const addFiles = (fileList) => {
    setError("")
    setMessage("")

    const incomingFiles = Array.from(fileList || [])
    const validFiles = []
    const rejectedFiles = []

    incomingFiles.forEach((file) => {
      const extension = getExtension(file.name)

      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        rejectedFiles.push(`${file.name}: unsupported file type`)
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        rejectedFiles.push(`${file.name}: larger than 10 MB`)
        return
      }

      validFiles.push(file)
    })

    setFiles((currentFiles) => {
      const keys = new Set(
        currentFiles.map(
          (file) =>
            `${file.webkitRelativePath || file.name}-${file.size}-${file.lastModified}`
        )
      )

      const next = [...currentFiles]

      validFiles.forEach((file) => {
        const key = `${file.webkitRelativePath || file.name}-${file.size}-${file.lastModified}`

        if (!keys.has(key)) {
          keys.add(key)
          next.push(file)
        }
      })

      return next
    })

    if (rejectedFiles.length > 0) {
      setError(
        `${rejectedFiles.length} file(s) skipped: ${rejectedFiles
          .slice(0, 4)
          .join(", ")}${rejectedFiles.length > 4 ? " ..." : ""}`
      )
    }
  }

  const handleFileChange = (event) => {
    addFiles(event.target.files)
    event.target.value = ""
  }

  const removeFile = (indexToRemove) => {
    setFiles((currentFiles) =>
      currentFiles.filter((_, index) => index !== indexToRemove)
    )
  }

  const resetUploadForm = () => {
    setFiles([])
    setDefaultSubject("")
    setResourceType("Notes")
    setDescription("")
    setUploadProgress({
      completed: 0,
      total: 0,
    })
  }

  const handleBulkUpload = async (event) => {
    event.preventDefault()

    setError("")
    setMessage("")

    if (!user) {
      setError("Please log in before uploading resources.")
      return
    }

    if (files.length === 0) {
      setError("Select at least one file.")
      return
    }

    setUploading(true)
    setUploadProgress({
      completed: 0,
      total: files.length,
    })

    const successfulResources = []
    const failedFiles = []

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]

        const subject =
          defaultSubject.trim() || detectSubject(file)

        if (!subject.trim()) {
          failedFiles.push({
            file,
            reason:
              "Subject not detected. Enter a default subject and retry.",
          })
          continue
        }

        const detectedType =
          detectResourceType(file) || resourceType

        const safeFileName = file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        )

        const filePath = `${user.id}/${crypto.randomUUID()}-${safeFileName}`

        setUploadProgress({
          completed: index,
          total: files.length,
        })

        try {
          const { error: uploadError } = await supabase.storage
            .from("resource-files")
            .upload(filePath, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: getMimeType(file),
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
              title: cleanTitle(file.name),
              description: description.trim(),
              subject: subject.trim(),
              resource_type: detectedType,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              mime_type: getMimeType(file),
              downloads: 0,
            })
            .select(
              "id, user_id, title, description, subject, resource_type, file_name, file_size, mime_type, downloads, created_at"
            )
            .single()

          if (insertError) {
            await supabase.storage
              .from("resource-files")
              .remove([filePath])

            throw insertError
          }

          successfulResources.push(insertedResource)
        } catch (fileError) {
          console.error(
            `Unable to upload ${file.name}:`,
            fileError
          )

          failedFiles.push({
            file,
            reason:
              fileError?.message || "Upload failed.",
          })
        }

        setUploadProgress({
          completed: index + 1,
          total: files.length,
        })
      }

      if (successfulResources.length > 0) {
        setResources((current) => [
          ...successfulResources,
          ...current,
        ])
      }

      if (failedFiles.length === 0) {
        setMessage(
          `${successfulResources.length} resource(s) uploaded successfully.`
        )
        resetUploadForm()
        setShowUpload(false)
      } else {
        setFiles(failedFiles.map((item) => item.file))

        setMessage(
          `${successfulResources.length} uploaded. ${failedFiles.length} file(s) remain selected for retry.`
        )

        setError(
          failedFiles
            .slice(0, 5)
            .map(
              (item) =>
                `${item.file.name}: ${item.reason}`
            )
            .join(" | ")
        )
      }
    } catch (bulkError) {
      console.error("Bulk upload failed:", bulkError)

      setError(
        bulkError?.message ||
          "Unable to upload the resources."
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
                Find notes, question papers, lab manuals and study material
                shared by students.
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
                  ? "✕ Close Bulk Upload"
                  : "＋ Bulk Upload"}
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

        {(error || message) && (
          <section className="mb-6 space-y-3">
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

        {showUpload && user && (
          <section className="mb-8 rounded-[2rem] border border-violet-500/20 bg-violet-500/5 p-5 sm:p-7">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
                Fast upload
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Upload multiple resources at once
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                Select many files or an entire folder. StudentHub will detect
                the subject from folder names where possible.
              </p>
            </div>

            <form onSubmit={handleBulkUpload} className="space-y-6">
              <div className="grid gap-5 lg:grid-cols-3">
                <div>
                  <label className="text-sm font-semibold text-zinc-300">
                    Default Subject
                  </label>

                  <input
                    value={defaultSubject}
                    onChange={(event) =>
                      setDefaultSubject(event.target.value)
                    }
                    placeholder="Optional — e.g. Database Management System"
                    className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                  />

                  <p className="mt-2 text-xs text-zinc-600">
                    Use this when all selected files belong to the same subject.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-zinc-300">
                    Default Resource Type
                  </label>

                  <select
                    value={resourceType}
                    onChange={(event) =>
                      setResourceType(event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none"
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
                    Common Description
                  </label>

                  <input
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    placeholder="Optional description for all files"
                    className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border border-zinc-700 bg-zinc-950 px-5 py-4 text-left transition hover:border-violet-500/50"
                >
                  <p className="text-lg font-bold">
                    📄 Select Multiple Files
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Choose many files together.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="rounded-2xl border border-violet-500/30 bg-violet-500/5 px-5 py-4 text-left transition hover:bg-violet-500/10"
                >
                  <p className="text-lg font-bold">
                    📁 Select Entire Folder
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Best for your BCA resource folders.
                  </p>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_EXTENSIONS.map(
                    (extension) => `.${extension}`
                  ).join(",")}
                  onChange={handleFileChange}
                  className="hidden"
                />

                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  webkitdirectory=""
                  directory=""
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {files.length} file
                      {files.length === 1 ? "" : "s"} selected
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      Maximum 10 MB per file
                    </p>
                  </div>

                  {files.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFiles([])}
                      className="text-xs font-bold text-red-400 hover:text-red-300"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {files.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-zinc-700 p-8 text-center">
                    <div className="text-4xl">📚</div>

                    <p className="mt-3 text-sm text-zinc-500">
                      No files selected yet
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 max-h-96 space-y-2 overflow-auto pr-1">
                    {files.map((file, index) => {
                      const detectedSubject =
                        defaultSubject.trim() ||
                        detectSubject(file)

                      const detectedType =
                        detectResourceType(file) ||
                        resourceType

                      return (
                        <div
                          key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                          className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">
                              {getFileIcon(getMimeType(file), file.name)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">
                                {file.name}
                              </p>

                              <p className="mt-1 truncate text-xs text-zinc-600">
                                {file.webkitRelativePath || file.name}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded-full border border-violet-500/20 bg-violet-500/5 px-2 py-1 text-[10px] font-bold text-violet-300">
                                  {detectedSubject || "Subject needed"}
                                </span>

                                <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] font-bold text-zinc-500">
                                  {detectedType}
                                </span>

                                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-600">
                                  {formatFileSize(file.size)}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="rounded-lg px-2 py-1 text-xs text-zinc-600 hover:bg-red-500/10 hover:text-red-300"
                              aria-label={`Remove ${file.name}`}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {uploading && (
                <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-semibold">
                      Uploading {uploadProgress.completed}/
                      {uploadProgress.total}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-violet-500 transition-all"
                      style={{
                        width: `${
                          uploadProgress.total
                            ? (uploadProgress.completed /
                                uploadProgress.total) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || files.length === 0}
                className="w-full rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploading
                  ? "Uploading resources..."
                  : `🚀 Upload ${files.length} Resource${
                      files.length === 1 ? "" : "s"
                    }`}
              </button>
            </form>
          </section>
        )}

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
                  <span>📄 {resource.file_name}</span>

                  <span>
                    💾 {formatFileSize(resource.file_size)}
                  </span>

                  <span>⬇ {resource.downloads || 0}</span>
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