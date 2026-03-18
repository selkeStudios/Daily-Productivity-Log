// Entry point for the background service worker.
// Delegates real work to controller modules to keep things modular.

import { Lifecycle } from "./controllers/lifecycle.js"

// Kick everything off
Lifecycle.registerListeners()
