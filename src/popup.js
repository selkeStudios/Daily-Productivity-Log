"use strict"

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;
}

function formatDateLabel(timestamp) {
    const date = new Date(timestamp);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
}

function getMostRecentDailyCutoff(referenceTime = Date.now()) {
    const now = new Date(referenceTime);
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0, 0);
    if (now < cutoff) {
        cutoff.setDate(cutoff.getDate() - 1);
    }
    return cutoff.getTime();
}

function buildPopupDom(divName, sortedDomains) {
    let popupDiv = document.getElementById(divName);
    popupDiv.innerHTML = '';
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
    chrome.storage.local.get(['productivityData', 'lastUpdated', 'reportWindowEnd'], (result) => {
        const sortedDomains = result.productivityData || [];
        const lastUpdated = result.lastUpdated;
        const reportWindowEnd = result.reportWindowEnd;
        const expectedWindowEnd = getMostRecentDailyCutoff();

        if (reportWindowEnd) {
            document.querySelector('h2').textContent = formatDateLabel(reportWindowEnd);
        } else if (lastUpdated) {
            document.querySelector('h2').textContent = formatDateLabel(lastUpdated);
        }

        const isFreshDailyWindow = reportWindowEnd === expectedWindowEnd;
        const isRecentlyUpdated = lastUpdated && (Date.now() - lastUpdated) <= ONE_DAY_IN_MS;

        if (!isFreshDailyWindow || !isRecentlyUpdated) {
            document.getElementById(divName).innerText = "Data not available. Please wait for the next 11:59 PM update.";
            return;
        }

        buildPopupDom(divName, sortedDomains);
        updateQuickStats(sortedDomains);
    });
}

async function ensureCurrentDailyLog() {
    const response = await sendRuntimeMessage({
        type: "ENSURE_DAILY_PRODUCTIVITY_LOG_CURRENT"
    });
    if (!response?.ok) {
        throw new Error(response?.error || "Unable to synchronize the data collection.");
    }
    return response;
}

async function runDailyLogDebug() {
    const runDailyLogButton = document.getElementById("runDailyLog");
    runDailyLogButton.disabled = true;
    setStatus("Running the data collection now...");
    try {
        const response = await sendRuntimeMessage({
            type: "RUN_DAILY_PRODUCTIVITY_LOG"
        });
        if (!response?.ok) {
            throw new Error(response?.error || "Unable to run the data collection.");
        }
        calculateTimeSpent("typedUrl_div");
        const updatedAt = new Date(response.lastUpdated);
        setStatus(`Data refreshed on ${updatedAt.toLocaleDateString([], { month: 'numeric', day: '2-digit', year: 'numeric' })}.`);
    } catch (error) {
        setStatus(error.message, true);
    } finally {
        runDailyLogButton.disabled = false;
    }
}

async function sendEmailReport() {
    const sendEmailButton = document.getElementById("sendEmail")
    sendEmailButton.disabled = true
    setStatus("Sending email...")
    try {
        const response = await sendRuntimeMessage({
            type: "SEND_DAILY_PRODUCTIVITY_EMAIL"
        })
        if (!response?.ok) throw new Error(response?.error || "Failed to send email.")
        setStatus("✅ Email sent!")
    } catch (error) {
        setStatus(error.message, true)
    } finally {
        sendEmailButton.disabled = false
    }
}

function updateQuickStats(sortedDomains) {
    const totalDuration = sortedDomains.reduce((total, [, duration]) => total + duration, 0);
    document.getElementById("totalSites").textContent = sortedDomains.length.toString();
    document.getElementById("totalTime").textContent = formatTime(totalDuration);
}

function setStatus(message, isError = false) {
    const statusMessage = document.getElementById("statusMessage");
    statusMessage.textContent = message;
    statusMessage.classList.toggle("error", isError);
}

function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve(response);
        })
    })
}

document.addEventListener('DOMContentLoaded', function () {
    void (async () => {
        try {
            await ensureCurrentDailyLog();
        } catch (error) {
            setStatus(error.message, true);
        }
        calculateTimeSpent('typedUrl_div');
    })();

    document.getElementById("runDailyLog").addEventListener("click", runDailyLogDebug);
    document.getElementById("sendEmail").addEventListener("click", sendEmailReport);
});