// ============================================================
// vPast — application entry
// Renders immediately; probes the serverless API in the
// background to decide server vs local storage mode.
// ============================================================

import { initRouter } from "./router.js";
import { probeApi, isApiMode } from "./store.js";

initRouter();

// informational; not blocking — createPaste/getPaste check
// apiMode at call time (well after this resolves).
probeApi().then(() => {
  document.documentElement.dataset.storage = isApiMode() ? "server" : "local";
});