// Lifecycle / Startup Layer
// Wires together all background subsystems.

import { initMessageRouter } from "./messageRouter.js"

function init() {
    // Initialize sub-systems here
    initMessageRouter()
}

function registerListeners() {
    chrome.runtime.onStartup.addListener(init)
    chrome.runtime.onInstalled.addListener(init)
}

export const Lifecycle = {
    init,
    registerListeners
}

