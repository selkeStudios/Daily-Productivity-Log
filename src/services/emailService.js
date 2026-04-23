const EMAIL_CONFIG = {
    to: "reshma2001d@gmail.com",
    subject: "Your Daily Productivity Log",
    body: "Hi, here is your daily productivity log"
}

function getAuthToken() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError || !token) {
                reject(new Error(chrome.runtime.lastError?.message || "Auth failed"))
                return
            }
            resolve(token)
        })
    })
}

function toBase64Url(text) {
    const bytes = new TextEncoder().encode(text)
    let binary = ""
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte)
    })
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function buildMimeEmail() {
    return [
        "Content-Type: text/plain; charset=\"UTF-8\"",
        "MIME-Version: 1.0",
        `To: ${EMAIL_CONFIG.to}`,
        `Subject: ${EMAIL_CONFIG.subject}`,
        "",
        EMAIL_CONFIG.body
    ].join("\r\n")
}

export async function sendDailyProductivityEmail() {
    const token = await getAuthToken()
    const rawEmail = toBase64Url(buildMimeEmail())

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw: rawEmail })
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gmail API error (${response.status}): ${errorText}`)
    }

    const payload = await response.json()
    console.log("Email sent successfully:", payload.id)
    return payload
}

