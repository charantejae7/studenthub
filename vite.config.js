import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
      ],

      manifest: {
        name: "StudentHub",
        short_name: "StudentHub",
        description:
          "Study planner, schedule, resources and focus tools for students.",
        theme_color: "#09090b",
        background_color: "#09090b",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",

        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
})