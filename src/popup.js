"use strict"

//Helper to format milliseconds into readable "HHh MMm SSs"
function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;
}

function buildPopupDom(divName, sortedDomains) {
    let popupDiv = document.getElementById(divName);
    popupDiv.innerHTML = ''; // Clear previous content

    let ul = document.createElement('ul');
    popupDiv.appendChild(ul);

    sortedDomains.forEach(([domain, duration]) => {
        let li = document.createElement('li');
        li.style.marginBottom = "8px";
        li.innerHTML = `<strong>${domain}</strong>: ${formatTime(duration)}`;
        ul.appendChild(li);
    });

    if (sortedDomains.length === 0) {
        popupDiv.innerText = "No activity found in the last 24 hours.";
    }
}

function calculateTimeSpent(divName) {
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

        buildPopupDom(divName, sortedDomains);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    calculateTimeSpent('typedUrl_div');
});