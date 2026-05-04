// Messaging / Events Layer
// Central place to route runtime messages to services.

import { sendDailyProductivityEmail } from "../services/emailService.js";
import {
    getGoogleAuthState,
    signInWithGoogle,
    signOutGoogle
} from "../services/googleAuthService.js";
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
                .then(() => {
                    sendResponse({ ok: true });
                })
                .catch((error) => {
                    console.error("Failed to send daily productivity email:", error);
                    sendResponse({ ok: false, error: error.message });
                });
            return true;

        case "GET_GOOGLE_AUTH_STATE":
            void getGoogleAuthState()
                .then((state) => {
                    sendResponse({ ok: true, signedIn: state.signedIn, emailId: state.emailId });
                })
                .catch((error) => {
                    console.error("Failed to read Google auth state:", error);
                    sendResponse({ ok: false, error: error.message, signedIn: false, emailId: "" });
                });
            return true;

        case "GOOGLE_SIGN_IN":
            void signInWithGoogle()
                .then((state) => {
                    sendResponse({ ok: true, emailId: state.emailId });
                })
                .catch((error) => {
                    console.error("Google sign-in failed:", error);
                    sendResponse({ ok: false, error: error.message });
                });
            return true;

        case "GOOGLE_SIGN_OUT":
            void signOutGoogle()
                .then(() => {
                    sendResponse({ ok: true });
                })
                .catch((error) => {
                    console.error("Google sign-out failed:", error);
                    sendResponse({ ok: false, error: error.message });
                });
            return true;
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

