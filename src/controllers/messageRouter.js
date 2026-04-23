// Messaging / Events Layer
// Central place to route runtime messages to services.

import { sendDailyProductivityEmail } from "../services/emailService.js";
import {
    ensureDailyProductivityLogIsCurrent,
    runDailyProductivityLog
} from "../services/productivityService.js";

let isMessageRouterInitialized = false;

function handleRuntimeMessage(message, sender, sendResponse) {
    if (!message || !message.type) {
        return false;
    }

    switch (message.type) {
        case "RUN_DAILY_PRODUCTIVITY_LOG":
            void runDailyProductivityLog("manual debug")
                .then(({ productivityData, lastUpdated, reportWindowEnd }) => {
                    sendResponse({ok: true, entriesCount: productivityData.length, lastUpdated});
                })
                .catch((error) => {
                    console.error("Failed to run the daily productivity log:", error);
                    sendResponse({ok: false, error: error.message});
                })
            return true;

        case "ENSURE_DAILY_PRODUCTIVITY_LOG_CURRENT":
            void ensureDailyProductivityLogIsCurrent("popup sync")
                .then(({ ran, productivityData, lastUpdated, reportWindowEnd }) => {
                    sendResponse({
                        ok: true,
                        ran,
                        entriesCount: productivityData.length,
                        lastUpdated,
                        reportWindowEnd
                    });
                })
                .catch((error) => {
                    console.error("Failed to synchronize the daily productivity log:", error);
                    sendResponse({ok: false, error: error.message});
                })
            return true;

        case "SEND_DAILY_PRODUCTIVITY_EMAIL":
            void sendDailyProductivityEmail()
            sendResponse({ ok: true });
            return false;
        default:
            return false;
    }
}

export function initMessageRouter() {
    if (isMessageRouterInitialized) {
        return;
    }

    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    isMessageRouterInitialized = true;
}

