"use strict"

export const DAILY_LOG_ALARM_NAME = "dailyLog"

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000
const IDLE_THRESHOLD_IN_MS = 30 * 60 * 1000
const MAX_HISTORY_RESULTS = 10000
const MAX_DOMAINS = 15

// Format milliseconds into a readable "HHh MMm SSs" string.
export function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60)
    const minutes = Math.floor((ms / (1000 * 60)) % 60)
    const hours = Math.floor(ms / (1000 * 60 * 60))

    return `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${seconds}s`
}

function searchHistory(query) {
    return new Promise((resolve, reject) => {
        chrome.history.search(query, (historyItems) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message))
                return
            }

            resolve(historyItems)
        })
    })
}

function setLocalStorage(values) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(values, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message))
                return
            }

            resolve()
        })
    })
}

async function collectProductivityData() {
    const oneDayAgo = Date.now() - ONE_DAY_IN_MS
    const historyItems = await searchHistory({
        text: "",
        startTime: oneDayAgo,
        maxResults: MAX_HISTORY_RESULTS
    })

    historyItems.sort((a, b) => a.lastVisitTime - b.lastVisitTime)

    const domainTimes = {}

    for (let i = 0; i < historyItems.length - 1; i += 1) {
        const current = historyItems[i]
        const next = historyItems[i + 1]
        const duration = next.lastVisitTime - current.lastVisitTime

        if (duration >= IDLE_THRESHOLD_IN_MS) {
            continue
        }

        try {
            const url = new URL(current.url)
            const domain = url.hostname
            domainTimes[domain] = (domainTimes[domain] || 0) + duration
        } catch (error) {
            console.error("Invalid URL in browsing history:", current.url, error)
        }
    }

    return Object.entries(domainTimes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_DOMAINS)
}

export async function runDailyProductivityLog(trigger = "manual") {
    const productivityData = await collectProductivityData()
    const lastUpdated = Date.now()

    await setLocalStorage({
        productivityData,
        lastUpdated
    })

    console.log(`Daily Productivity Log (${trigger}) - Top ${MAX_DOMAINS} sites:`)
    productivityData.forEach(([domain, duration]) => {
        console.log(`${domain}: ${formatTime(duration)}`)
    })

    if (productivityData.length === 0) {
        console.log("No activity found in the last 24 hours.")
    }

    return {
        productivityData,
        lastUpdated
    }
}

export function scheduleDailyLog() {
    const now = new Date()
    const nextRun = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0, 0)

    if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1)
    }

    chrome.alarms.create(DAILY_LOG_ALARM_NAME, {
        when: nextRun.getTime(),
        periodInMinutes: 24 * 60
    })

    console.log(`Next daily productivity log scheduled for ${nextRun.toLocaleString()}`)
}
