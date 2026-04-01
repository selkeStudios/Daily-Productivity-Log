// Messaging / Events Layer
// Central place to route runtime messages to services.

import { sendDailyProductivityEmail } from "../services/emailService.js"

function handleRuntimeMessage(message, sender, sendResponse) {
    if (!message || !message.type) {
        return false
    }

    switch (message.type) {
        case "SEND_DAILY_PRODUCTIVITY_EMAIL":
            void sendDailyProductivityEmail()
            sendResponse({ ok: true })
            return false
        // Add more cases here as you add new features, e.g.:
        // case "GENERATE_DAILY_REPORT":
        //     ...
        //     return true/false
        default:
            return false
    }
}

export function initMessageRouter() {
    chrome.runtime.onMessage.addListener(handleRuntimeMessage)
}

