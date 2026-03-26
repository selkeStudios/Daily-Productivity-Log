"use strict";

function formatTime(ms) {
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours}h ${minutes}m`;
}

document.addEventListener('DOMContentLoaded', () => {
    const displayDiv = document.getElementById('typedUrl_div');

    //Retrieve the data saved by the background script
    chrome.storage.local.get(["lastRunData", "lastRunTimestamp"], (data) => {
        if (!data.lastRunData) {
            displayDiv.innerText = "No data gathered yet. Wait for the next scheduled run.";
            return;
        }

        const sorted = Object.entries(data.lastRunData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); //Only lists the top 10 websites
    });
});