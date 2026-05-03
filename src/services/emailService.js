"use strict"

// ⚠️ Fill in your own Gemini API key for local testing
// Get a free key at: https://aistudio.google.com/apikey
// Do NOT commit your key to GitHub
const GEMINI_API_KEY = "Your Gemini API KEY"

const EMAIL_CONFIG = {
    to: "reshma2001d@gmail.com",
    subject: "Your Daily Productivity Report - Gander",
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

// Format milliseconds into readable string
function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60)
    const minutes = Math.floor((ms / (1000 * 60)) % 60)
    const hours = Math.floor(ms / (1000 * 60 * 60))
    return `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${seconds}s`
}

// Call Gemini API to generate AI productivity summary
async function generateAISummary(productivityData) {
    const dataText = productivityData
        .map(([domain, ms]) => `${domain}: ${formatTime(ms)}`)
        .join("\n")

    const prompt = `You are a productivity coach. Here is a user's browsing activity from the past 24 hours:

${dataText}

Please provide:
1. A brief analysis of their productivity patterns (2-3 sentences)
2. Which sites seem productive vs. distracting
3. Three specific, actionable tips to improve their productivity tomorrow
4. Do not use markdown formatting like ** or *. Use plain text only.`

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { maxOutputTokens: 2000 },
                    }),
                }
            )

            if (response.status === 503) {
                console.warn(`Gemini busy, retrying (${attempt}/3)...`)
                await new Promise(r => setTimeout(r, 2000 * attempt))
                continue
            }

            if (!response.ok) {
                const errorText = await response.text()
                console.error("Gemini API error:", response.status, errorText)
                return null
            }

            const data = await response.json()
            return data.candidates?.[0]?.content?.parts?.[0]?.text || null
        } catch (error) {
            console.error("Failed to call Gemini API:", error)
            return null
        }
    }

    return null
}

// Get productivity data from Chrome storage
function getStoredProductivityData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["productivityData", "lastUpdated"], (result) => {
            resolve({
                productivityData: result.productivityData || [],
                lastUpdated: result.lastUpdated || null,
            })
        })
    })
}

function buildMimeEmail(body) {
    return [
        'Content-Type: text/plain; charset="UTF-8"',
        "MIME-Version: 1.0",
        `To: ${EMAIL_CONFIG.to}`,
        `Subject: ${EMAIL_CONFIG.subject}`,
        "",
        body,
    ].join("\r\n")
}

function buildEmailBody(productivityData, aiSummary, lastUpdated) {
    const dateStr = lastUpdated
        ? new Date(lastUpdated).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
          })
        : "Yesterday"

    // Build the browsing data section
    const dataLines = productivityData
        .map(([domain, ms], i) => `  ${i + 1}. ${domain}: ${formatTime(ms)}`)
        .join("\n")

    const browsingSection =
        productivityData.length > 0
            ? `📊 YOUR BROWSING ACTIVITY (${dateStr})\n${"─".repeat(40)}\n${dataLines}`
            : `📊 No browsing activity recorded for ${dateStr}.`

    // Build the AI summary section
    const aiSection = aiSummary
        ? `\n\n🤖 AI PRODUCTIVITY ANALYSIS\n${"─".repeat(40)}\n${aiSummary}`
        : `\n\n💡 TIP\n${"─".repeat(40)}\nCheck your browsing habits regularly to stay on top of your productivity!`

    return `Hi there! 👋

Here is your daily productivity report from Gander.

${browsingSection}${aiSection}

─────────────────────────────────────────
Gander - Productivity Tracker
This report was generated automatically by your Gander Chrome Extension.`
}

export async function sendDailyProductivityEmail() {
    try {
        console.log("📧 Preparing daily productivity email...")

        // 1. Get stored productivity data
        const { productivityData, lastUpdated } = await getStoredProductivityData()
        console.log(`Found ${productivityData.length} domains in stored data.`)

        // 2. Generate AI summary using Gemini
        let aiSummary = null
        if (productivityData.length > 0) {
            console.log("🤖 Calling Gemini API for AI summary...")
            aiSummary = await generateAISummary(productivityData)
            if (aiSummary) {
                console.log("✅ AI summary generated successfully.")
            } else {
                console.warn("⚠️ AI summary failed, sending email without AI analysis.")
            }
        }

        // 3. Build email body
        const emailBody = buildEmailBody(productivityData, aiSummary, lastUpdated)

        // 4. Get Gmail auth token
        const token = await getAuthToken()

        // 5. Send email via Gmail API
        const rawEmail = toBase64Url(buildMimeEmail(emailBody))
        const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ raw: rawEmail }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error("❌ Gmail API Error:", response.status, errorText)
            return
        }

        console.log("✅ Email sent successfully with AI productivity analysis!")
    } catch (error) {
        console.error("❌ Error sending email:", error)
    }
}