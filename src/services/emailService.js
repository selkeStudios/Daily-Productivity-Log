// Email / Notification Layer
// Handles all outgoing emails for the extension.

const SMTP_CONFIG = {
    endpoint: "https://your-smtp-service.example.com/send", // Replace with your SMTP/API URL
    to: "user@example.com", // Hardcoded recipient for now
    from: "no-reply@example.com",
    subject: "Your Daily Productivity Log",
    body: "hi here is ur daily productivity log"
}

export async function sendDailyProductivityEmail() {
    try {
        const response = await fetch(SMTP_CONFIG.endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                to: SMTP_CONFIG.to,
                from: SMTP_CONFIG.from,
                subject: SMTP_CONFIG.subject,
                text: SMTP_CONFIG.body
            })
        })

        if (!response.ok) {
            console.error("Failed to send daily productivity email", response.status, await response.text())
            return
        }

        console.log("Daily productivity email sent successfully")
    } catch (error) {
        console.error("Error sending daily productivity email", error)
    }
}

