// UI / Badge Layer
// Responsible for updating the extension action badge.

export function setBadgeText(enabled) {
    const text = enabled ? "ON" : "OFF"
    void chrome.action.setBadgeText({ text })
}

export function initBadge() {
    chrome.storage.sync.get("enabled", (data) => {
        setBadgeText(!!data.enabled)
    })
}

