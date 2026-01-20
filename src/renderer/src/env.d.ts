/// <reference types="vite/client" />

interface Window {
  api: {
    onUploadSuccess: (callback: (link: string) => void) => void
  }
}