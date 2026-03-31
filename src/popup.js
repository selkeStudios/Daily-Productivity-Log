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
    });
}

document.addEventListener('DOMContentLoaded', function () {
    calculateTimeSpent('typedUrl_div');
});