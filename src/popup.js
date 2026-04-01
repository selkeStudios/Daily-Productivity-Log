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

function buildSummaryDom(summary) {
    const summaryDiv = document.getElementById("summary_div");

    if (!summary) {
        summaryDiv.innerText = "Summary not available yet.";
        return;
    }

    summaryDiv.innerHTML = `
        <div><strong>Productive:</strong> ${formatTime(summary.productiveTime)}</div>
        <div><strong>Unproductive:</strong> ${formatTime(summary.unproductiveTime)}</div>
        <div><strong>Neutral:</strong> ${formatTime(summary.neutralTime)}</div>
    `;
}

function buildRecommendationDom(recommendations) {
    const recommendationDiv = document.getElementById("recommendation_div");
    recommendationDiv.innerHTML = "";

    if (!recommendations || recommendations.length === 0) {
        recommendationDiv.innerText = "No recommendations available yet.";
        return;
    }

    let ul = document.createElement("ul");
    recommendationDiv.appendChild(ul);

    recommendations.forEach((item) => {
        let li = document.createElement("li");
        li.style.marginBottom = "8px";
        li.textContent = item;
        ul.appendChild(li);
    });
}

function updateQuickStats(sortedDomains) {
    const totalSites = sortedDomains.length;
    const totalTime = sortedDomains.reduce((sum, [, duration]) => sum + duration, 0);

    document.getElementById("totalSites").textContent = totalSites;
    document.getElementById("totalTime").textContent = formatTime(totalTime);
}

function calculateTimeSpent(divName) {
    chrome.storage.local.get(
        ['productivityData', 'lastUpdated', 'categorySummary', 'recommendations'],
        (result) => {
            const sortedDomains = result.productivityData || [];
            const lastUpdated = result.lastUpdated;
            const categorySummary = result.categorySummary;
            const recommendations = result.recommendations || [];

            //Check if data is recent (within last 24 hours)
            if (!lastUpdated || (Date.now() - lastUpdated) > (24 * 60 * 60 * 1000)) {
                document.getElementById(divName).innerText = "Data not available. Please wait for daily update.";
                document.getElementById("summary_div").innerText = "Summary not available yet.";
                document.getElementById("recommendation_div").innerText = "Recommendations not available yet.";
                document.getElementById("totalSites").textContent = "--";
                document.getElementById("totalTime").textContent = "--";
                return;
            }

            buildPopupDom(divName, sortedDomains);
            buildSummaryDom(categorySummary);
            buildRecommendationDom(recommendations);
            updateQuickStats(sortedDomains);
        }
    );
}

document.addEventListener('DOMContentLoaded', function () {
    calculateTimeSpent('typedUrl_div');

    document.getElementById("sendEmail").addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "SEND_EMAIL" });
    });
});