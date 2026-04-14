"use strict"

import { Lifecycle } from "./controllers/lifecycle.js"
import {
    DAILY_LOG_ALARM_NAME,
    runDailyProductivityLog,
    scheduleDailyLog
} from "./services/productivityService.js"

Lifecycle.registerListeners()

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === DAILY_LOG_ALARM_NAME) {
        void runDailyProductivityLog("scheduled")
    }
})

Lifecycle.init()
scheduleDailyLog()

// Recreate the alarm when Chrome starts or the extension is installed/updated.
chrome.runtime.onStartup.addListener(scheduleDailyLog)
chrome.runtime.onInstalled.addListener(scheduleDailyLog)
