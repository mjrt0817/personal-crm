import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "業務管理",
    short_name: "業務管理",
    description: "個人用 SFA / CRM / 案件・タスク管理",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5f7fa",
    theme_color: "#172033",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  };
}
