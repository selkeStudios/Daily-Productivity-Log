"use strict"

import { Lifecycle } from "./controllers/lifecycle.js";
import {
    DAILY_LOG_ALARM_NAME,
    ensureDailyProductivityLogIsCurrent,
    runDailyProductivityLog,
    scheduleDailyLog
} from "./services/productivityService.js";

Lifecycle.registerListeners();
Lifecycle.init();

async function initializeDailyLog() {
    scheduleDailyLog();

    try {
        await ensureDailyProductivityLogIsCurrent("startup sync");
    } catch (error) {
        console.error("Failed to synchronize the daily productivity log on startup:", error);
    }
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === DAILY_LOG_ALARM_NAME) {
        void runDailyProductivityLog("scheduled")
            .catch((error) => {
                console.error("Failed to run the scheduled daily productivity log:", error);
            })
            .finally(() => {
                scheduleDailyLog();
            })
    }
})

void initializeDailyLog();
