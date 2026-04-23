"use strict"

import { summarizeByCategory, generateRecommendations } from "./recommendationService.js"

export const DAILY_LOG_ALARM_NAME = "dailyLog";

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
const IDLE_THRESHOLD_IN_MS = 30 * 60 * 1000;
const MAX_HISTORY_RESULTS = 10000;
const MAX_DOMAINS = 15;
const DAILY_LOG_CUTOFF_HOUR = 23;
const DAILY_LOG_CUTOFF_MINUTE = 59;
const DAILY_LOG_STORAGE_KEYS = [
    "productivityData",
    "lastUpdated",
    "reportWindowStart",
    "reportWindowEnd",
    "lastCompletedCutoff",
    "categorySummary",
    "recommendations",
];

let activeDailyLogOperation = null;

// Format milliseconds into a readable "HHh MMm SSs" string.
export function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    return `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${seconds}s`;
}

function searchHistory(query) {
    return new Promise((resolve, reject) => {
        chrome.history.search(query, (historyItems) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(historyItems);
        })
    })
}

function setLocalStorage(values) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(values, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve();
        })
    })
}

function getLocalStorage(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(result);
        })
    })
}

function runExclusiveDailyLogOperation(task) {
    if (activeDailyLogOperation) {
        return activeDailyLogOperation;
    }

    activeDailyLogOperation = (async () => {
        try {
            return await task();
        } finally {
            activeDailyLogOperation = null;
        }
    })()

    return activeDailyLogOperation;
}

function getDailyCutoffForDate(date) {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        DAILY_LOG_CUTOFF_HOUR,
        DAILY_LOG_CUTOFF_MINUTE,
        0,
        0
    );
}

export function getMostRecentDailyCutoff(referenceTime = Date.now()) {
    const now = new Date(referenceTime);
    const cutoff = getDailyCutoffForDate(now);

    if (now < cutoff) {
        cutoff.setDate(cutoff.getDate() - 1);
    }

    return cutoff;
}

function normalizeWindowEnd(windowEnd, referenceTime = Date.now()) {
    if (windowEnd instanceof Date) {
        return new Date(windowEnd.getTime());
    }

    if (typeof windowEnd === "number") {
        return new Date(windowEnd);
    }

    return getMostRecentDailyCutoff(referenceTime);
}

async function collectProductivityData(windowStart, windowEnd) {
    const historyItems = await searchHistory({
        text: "",
        startTime: windowStart,
        endTime: windowEnd,
        maxResults: MAX_HISTORY_RESULTS
    });

    historyItems.sort((a, b) => a.lastVisitTime - b.lastVisitTime);

    const domainTimes = {};

    for (let i = 0; i < historyItems.length; i += 1) {
        const current = historyItems[i];
        const nextVisitTime = historyItems[i + 1]?.lastVisitTime ?? windowEnd;
        const duration = Math.min(nextVisitTime, windowEnd) - current.lastVisitTime;

        if (duration <= 0 || duration >= IDLE_THRESHOLD_IN_MS) {
            continue;
        }

        try {
            const url = new URL(current.url);
            const domain = url.hostname;
            domainTimes[domain] = (domainTimes[domain] || 0) + duration;
        } catch (error) {
            console.error("Invalid URL in browsing history:", current.url, error);
        }
    }

    return Object.entries(domainTimes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_DOMAINS);
}

async function runDailyProductivityLogInternal(trigger = "manual", options = {}) {
    const windowEnd = normalizeWindowEnd(options.windowEnd, options.referenceTime);
    const reportWindowEnd = windowEnd.getTime();
    const reportWindowStart = reportWindowEnd - ONE_DAY_IN_MS;
    const productivityData = await collectProductivityData(reportWindowStart, reportWindowEnd);
    const lastUpdated = Date.now()
    const categorySummary = summarizeByCategory(productivityData)
    const recommendations = generateRecommendations(categorySummary)

    await setLocalStorage({
        productivityData,
        lastUpdated,
        reportWindowStart,
        reportWindowEnd,
        lastCompletedCutoff: reportWindowEnd,
        categorySummary,
        recommendations,
    });

    console.log(
        `Daily Productivity Log (${trigger}) for ${new Date(reportWindowStart).toLocaleString()} - ${new Date(reportWindowEnd).toLocaleString()}`
    );
    console.log(`Top ${MAX_DOMAINS} sites:`)
    productivityData.forEach(([domain, duration]) => {
        console.log(`${domain}: ${formatTime(duration)}`)
    });

    if (productivityData.length === 0) {
        console.log("No activity found in the completed reporting window.");
    }

    return {
        productivityData,
        lastUpdated,
        reportWindowStart,
        reportWindowEnd,
        lastCompletedCutoff: reportWindowEnd,
        categorySummary,
        recommendations,
    };
}

export function runDailyProductivityLog(trigger = "manual", options = {}) {
    return runExclusiveDailyLogOperation(() => runDailyProductivityLogInternal(trigger, options));
}

async function ensureDailyProductivityLogIsCurrentInternal(trigger = "startup", referenceTime = Date.now()) {
    const targetCutoff = getMostRecentDailyCutoff(referenceTime).getTime();
    const storedData = await getLocalStorage(DAILY_LOG_STORAGE_KEYS);
    const lastCompletedCutoff = storedData.lastCompletedCutoff ?? storedData.reportWindowEnd;

    if (lastCompletedCutoff === targetCutoff) {
        return {
            ran: false,
            productivityData: storedData.productivityData || [],
            lastUpdated: storedData.lastUpdated,
            reportWindowStart: storedData.reportWindowStart,
            reportWindowEnd: storedData.reportWindowEnd,
            lastCompletedCutoff
        };
    }

    const result = await runDailyProductivityLogInternal(trigger, {
        windowEnd: targetCutoff
    });

    return {
        ran: true,
        ...result
    };
}

export function ensureDailyProductivityLogIsCurrent(trigger = "startup", referenceTime = Date.now()) {
    return runExclusiveDailyLogOperation(() => ensureDailyProductivityLogIsCurrentInternal(trigger, referenceTime));
}

export function scheduleDailyLog(referenceTime = Date.now()) {
    const now = new Date(referenceTime);
    const nextRun = getDailyCutoffForDate(now);

    if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
    }

    chrome.alarms.create(DAILY_LOG_ALARM_NAME, {
        when: nextRun.getTime()
    })

    console.log(`Next daily productivity log scheduled for ${nextRun.toLocaleString()}`);
}
