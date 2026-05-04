"use strict";

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

function getViews() {
    return {
        checking: document.getElementById("checkingView"),
        auth: document.getElementById("authView"),
        app: document.getElementById("appView"),
    };
}

function showView(name) {
    const { checking, auth, app } = getViews();
    checking.classList.toggle("hidden", name !== "checking");
    auth.classList.toggle("hidden", name !== "auth");
    app.classList.toggle("hidden", name !== "app");
}

function requestAuthToken(interactive) {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive }, (token) => {
            if (chrome.runtime.lastError || !token) {
                reject(new Error(chrome.runtime.lastError?.message || "Sign-in was cancelled."));
                return;
            }
            resolve(token);
        });
    });
}

async function isSignedIn() {
    try {
        await requestAuthToken(false);
        return true;
    } catch {
        return false;
    }
}

function signOutGoogle() {
    return new Promise((resolve) => {
        chrome.identity.clearAllCachedAuthTokens(() => {
            if (chrome.runtime.lastError) {
                console.warn(chrome.runtime.lastError.message);
            }
            resolve();
        });
    });
}

function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours > 0 ? hours + "h " : ""}${minutes}m ${seconds}s`;
}

function formatDateLabel(timestamp) {
    const date = new Date(timestamp);
    return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date
        .getDate()
        .toString()
        .padStart(2, "0")}/${date.getFullYear()}`;
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
    const popupDiv = document.getElementById(divName);
    popupDiv.innerHTML = "";

    const ul = document.createElement("ul");
    popupDiv.appendChild(ul);

    sortedDomains.forEach(([domain, duration]) => {
        const li = document.createElement("li");
        li.style.marginBottom = "8px";
        li.innerHTML = `<strong>${domain}</strong>: ${formatTime(duration)}`;
        ul.appendChild(li);
    });

    if (sortedDomains.length === 0) {
        popupDiv.innerText = "No activity found in the last 24 hours.";
    }
}

function calculateTimeSpent(divName) {
    chrome.storage.local.get(["productivityData", "lastUpdated", "reportWindowEnd"], (result) => {
        const sortedDomains = result.productivityData || [];
        const lastUpdated = result.lastUpdated;
        const reportWindowEnd = result.reportWindowEnd;
        const expectedWindowEnd = getMostRecentDailyCutoff();

        const titleEl = document.querySelector("#appView .header h2");
        if (reportWindowEnd && titleEl) {
            titleEl.textContent = formatDateLabel(reportWindowEnd);
        } else if (lastUpdated && titleEl) {
            titleEl.textContent = formatDateLabel(lastUpdated);
        }

        const isFreshDailyWindow = reportWindowEnd === expectedWindowEnd;
        const isRecentlyUpdated = lastUpdated && Date.now() - lastUpdated <= ONE_DAY_IN_MS;

        if (!isFreshDailyWindow || !isRecentlyUpdated) {
            document.getElementById(divName).innerText =
                "Data not available. Please wait for the next 11:59 PM update.";
            return;
        }

        buildPopupDom(divName, sortedDomains);
        updateQuickStats(sortedDomains);
    });
}

async function ensureCurrentDailyLog() {
    const response = await sendRuntimeMessage({
        type: "ENSURE_DAILY_PRODUCTIVITY_LOG_CURRENT",
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
            type: "RUN_DAILY_PRODUCTIVITY_LOG",
        });

        if (!response?.ok) {
            throw new Error(response?.error || "Unable to run the data collection.");
        }

        calculateTimeSpent("typedUrl_div");

        const updatedAt = new Date(response.lastUpdated);
        setStatus(
            `Data refreshed on ${updatedAt.toLocaleDateString([], {
                month: "numeric",
                day: "2-digit",
                year: "numeric",
            })}.`
        );
    } catch (error) {
        setStatus(error.message, true);
    } finally {
        runDailyLogButton.disabled = false;
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

function setAuthStatus(message, isError = false) {
    const el = document.getElementById("authStatusMessage");
    el.textContent = message;
    el.classList.toggle("error", isError);
}

function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(response);
        });
    });
}

async function bootstrapAppView() {
    try {
        await ensureCurrentDailyLog();
    } catch (error) {
        setStatus(error.message, true);
    }

    calculateTimeSpent("typedUrl_div");
}

document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("loginGoogle");
    const signOutBtn = document.getElementById("signOut");

    void (async () => {
        showView("checking");
        const signedIn = await isSignedIn();
        if (signedIn) {
            showView("app");
            await bootstrapAppView();
        } else {
            showView("auth");
        }
    })();

    loginBtn.addEventListener("click", async () => {
        loginBtn.disabled = true;
        setAuthStatus("");

        try {
            await requestAuthToken(true);
            showView("app");
            await bootstrapAppView();
        } catch (error) {
            setAuthStatus(error.message, true);
        } finally {
            loginBtn.disabled = false;
        }
    });

    signOutBtn.addEventListener("click", async () => {
        signOutBtn.disabled = true;
        try {
            await signOutGoogle();
            setStatus("");
            showView("auth");
        } finally {
            signOutBtn.disabled = false;
        }
    });

    document.getElementById("runDailyLog").addEventListener("click", runDailyLogDebug);

    document.getElementById("sendEmail").addEventListener("click", async () => {
        const sendEmailButton = document.getElementById("sendEmail");
        sendEmailButton.disabled = true;
        setStatus("Sending report email...");

        try {
            const response = await sendRuntimeMessage({ type: "SEND_DAILY_PRODUCTIVITY_EMAIL" });

            if (!response?.ok) {
                throw new Error(response?.error || "Unable to send the report email.");
            }

            setStatus("Report email sent successfully.");
        } catch (error) {
            setStatus(error.message, true);
        } finally {
            sendEmailButton.disabled = false;
        }
    });
});
