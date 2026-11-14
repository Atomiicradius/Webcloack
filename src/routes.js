/**
 * routes.js — Lazy route loaders shared by the router and the landing page.
 * Calling loadCameraApp() only downloads the /app chunk; it starts nothing.
 */
export const loadCameraApp = () => import('./CameraApp.jsx')
