"use strict"

import { Lifecycle } from "./controllers/lifecycle.js"

// Kick everything off
Lifecycle.registerListeners()

//Helper to format milliseconds into readable "HHh MMm SSs"
function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;
}

function calculateTimeSpent() {
    const oneDayAgo = new Date().getTime() - (24 * 60 * 60 * 1000);
    const IDLE_THRESHOLD = 30 * 60 * 1000;

    chrome.history.search({
        text: '',
        startTime: oneDayAgo,
        maxResults: 10000
    }, (historyItems) => {
        //Sort history items by time (oldest to newest)
        historyItems.sort((a, b) => a.lastVisitTime - b.lastVisitTime);

        const domainTimes = {};

        for (let i = 0; i < historyItems.length - 1; i++) {
            const current = historyItems[i];
            const next = historyItems[i + 1];
            const duration = next.lastVisitTime - current.lastVisitTime;

            //Only count if the gap is less than our idle threshold
            if (duration < IDLE_THRESHOLD) {
                try {
                    const url = new URL(current.url);
                    const domain = url.hostname;
                    domainTimes[domain] = (domainTimes[domain] || 0) + duration;
                } catch (e) {
                    console.error("Invalid URL:", current.url);
                }
            }
        }

        //Convert object to array and sort by duration (descending)
        const sortedDomains = Object.entries(domainTimes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15); // Show top 15 sites

        //Store the data for the popup to use
        chrome.storage.local.set({
            productivityData: sortedDomains,
            lastUpdated: Date.now()
        });

        //Output the data
        console.log("Daily Productivity Log - Top 15 sites:");
        sortedDomains.forEach(([domain, duration]) => {
            console.log(`${domain}: ${formatTime(duration)}`);
        });

        if (sortedDomains.length === 0) {
            console.log("No activity found in the last 24 hours.");
        }
    });
}

//Set up alarm for 11:59 PM every day
function scheduleDailyLog() {
    const now = new Date();
    const nextRun = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0, 0);

    const delayInMinutes = (nextRun - now) / (1000 * 60);

    chrome.alarms.create('dailyLog', {
        delayInMinutes: delayInMinutes,
        periodInMinutes: 24 * 60 // Repeat every 24 hours
    });
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'dailyLog') {
        calculateTimeSpent();
    }
});

//Schedule the alarm for when the service worker starts
scheduleDailyLog();