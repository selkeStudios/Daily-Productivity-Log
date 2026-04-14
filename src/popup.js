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
    chrome.storage.local.get(['productivityData', 'lastUpdated'], (result) => {
        const sortedDomains = result.productivityData || [];
        const lastUpdated = result.lastUpdated;

        //Update the title with the date
        if (lastUpdated) {
            const date = new Date(lastUpdated);
            const dateString = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
            document.querySelector('h2').textContent = `${dateString}`;
        }

        //Check if data is recent (within last 24 hours)
        if (!lastUpdated || (Date.now() - lastUpdated) > (24 * 60 * 60 * 1000)) {
            //Data is stale, show a message
            document.getElementById(divName).innerText = "Data not available. Please wait for daily update.";
            return;
        }
        buildPopupDom(divName, sortedDomains);
        updateQuickStats(sortedDomains);
    });
}

async function runDailyLogDebug() {
    const runDailyLogButton = document.getElementById("runDailyLog")
    runDailyLogButton.disabled = true
    setStatus("Running the nightly data collection now...")

    try {
        const response = await sendRuntimeMessage({
            type: "RUN_DAILY_PRODUCTIVITY_LOG"
        })

        if (!response?.ok) {
            throw new Error(response?.error || "Unable to run the nightly data collection.");
        }

        calculateTimeSpent("typedUrl_div");

        const updatedAt = new Date(response.lastUpdated);
        setStatus(`Nightly data refreshed at ${updatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`);
    } catch (error) {
        setStatus(error.message, true);
    } finally {
        runDailyLogButton.disabled = false;
    }
}

function updateQuickStats(sortedDomains) {
    const totalDuration = sortedDomains.reduce((total, [, duration]) => total + duration, 0)

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
    calculateTimeSpent('typedUrl_div');
        document.getElementById("runDailyLog").addEventListener("click", runDailyLogDebug);
});

document.getElementById("sendEmail").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "SEND_EMAIL" })
  })