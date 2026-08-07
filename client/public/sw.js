// Minimal service worker so the app is installable as a PWA.
// No offline caching for MVP — just registers so browsers offer "Install".
const CACHE_NAME = "kristelmatch-v1";
self.addEventListener("install", (event) => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (event) => {
  // Network-first for everything; fall through to browser default.
  return;
});
