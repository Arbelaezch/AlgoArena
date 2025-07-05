export const env = {
  BACKEND_API_URL:
    import.meta.env["VITE_BACKEND_API_URL"] || "http://localhost:5000/api",
} as const;
