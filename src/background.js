"use strict"

function scheduleDailyRun() {
    const now = new Date();
    const nightRun = new Date();
    
    //Set target to 11:59:00 PM today
    nightRun.setHours(23, 59, 0, 0);

    //If it's already past 11:59 PM today, schedule it for tomorrow
    if (now.getTime() >= nightRun.getTime()) {
        nightRun.setDate(nightRun.getDate() + 1);
    }

    const delayInMinutes = (nightRun.getTime() - now.getTime()) / 1000 / 60;

    //Create the alarm with the calculated delay
    chrome.alarms.create("dailyHistoryRun", {
        delayInMinutes: delayInMinutes,
        periodInMinutes: 1440 //Repeat every 24 hours (1440 minutes)
    });
}

//Trigger scheduling when extension starts or is installed
chrome.runtime.onInstalled.addListener(scheduleDailyRun);
chrome.runtime.onStartup.addListener(scheduleDailyRun);

//Listener for the alarm remains the same
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "dailyHistoryRun") {
        performHistoryCheck(); //This function contains the Google Chrome History API logic
    }
});

function performHistoryCheck() {
    const oneDayAgo = new Date().getTime() - (24 * 60 * 60 * 1000);
    const IDLE_THRESHOLD = 30 * 60 * 1000;

    chrome.history.search({
        text: '',
        startTime: oneDayAgo,
        maxResults: 10000
    }, (historyItems) => {
        historyItems.sort((a, b) => a.lastVisitTime - b.lastVisitTime);

        const domainTimes = {};
        for (let i = 0; i < historyItems.length - 1; i++) {
            const current = historyItems[i];
            const next = historyItems[i + 1];
            const duration = next.lastVisitTime - current.lastVisitTime;

            if (duration < IDLE_THRESHOLD) {
                try {
                    const domain = new URL(current.url).hostname;
                    domainTimes[domain] = (domainTimes[domain] || 0) + duration;
                } catch (e) {}
            }
        }

        //Save the results to storage for the popup to read later
        chrome.storage.local.set({ 
            lastRunData: domainTimes,
            lastRunTimestamp: new Date().getTime()
        }, () => {});
    });
}