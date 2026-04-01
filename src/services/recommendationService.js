"use strict"

const PRODUCTIVE_DOMAINS = [
    "github.com",
    "stackoverflow.com",
    "developer.mozilla.org",
    "docs.google.com",
    "drive.google.com",
    "canvas.slu.edu",
    "slu.edu",
    "chatgpt.com",
    "leetcode.com",
    "w3schools.com"
]

const UNPRODUCTIVE_DOMAINS = [
    "youtube.com",
    "netflix.com",
    "tiktok.com",
    "instagram.com",
    "facebook.com",
    "x.com",
    "twitter.com",
    "reddit.com",
    "twitch.tv"
]

function normalizeDomain(domain) {
    return domain.replace(/^www\./, "").toLowerCase()
}

function domainMatches(domain, target) {
    return domain === target || domain.endsWith("." + target)
}

export function getCategory(domain) {
    const normalized = normalizeDomain(domain)

    if (PRODUCTIVE_DOMAINS.some((item) => domainMatches(normalized, item))) {
        return "productive"
    }

    if (UNPRODUCTIVE_DOMAINS.some((item) => domainMatches(normalized, item))) {
        return "unproductive"
    }

    return "neutral"
}

export function summarizeByCategory(domainEntries) {
    const summary = {
        productiveTime: 0,
        unproductiveTime: 0,
        neutralTime: 0,
        categorizedDomains: []
    }

    domainEntries.forEach(([domain, duration]) => {
        const category = getCategory(domain)

        if (category === "productive") {
            summary.productiveTime += duration
        } else if (category === "unproductive") {
            summary.unproductiveTime += duration
        } else {
            summary.neutralTime += duration
        }

        summary.categorizedDomains.push({
            domain,
            duration,
            category
        })
    })

    return summary
}

export function generateRecommendations(summary) {
    const recommendations = []

    const oneHour = 60 * 60 * 1000
    const twoHours = 2 * oneHour

    const productiveTime = summary.productiveTime
    const unproductiveTime = summary.unproductiveTime
    const neutralTime = summary.neutralTime
    const totalTime = productiveTime + unproductiveTime + neutralTime

    if (totalTime === 0) {
        return ["No browsing data available yet."]
    }

    if (unproductiveTime >= twoHours) {
        recommendations.push(
            "You spent a lot of time on distracting websites today. Try setting a limit for entertainment sites tomorrow."
        )
    }

    if (productiveTime > unproductiveTime) {
        recommendations.push(
            "Nice job — your productive browsing time was higher than your distracting browsing time today."
        )
    }

    if (productiveTime < oneHour) {
        recommendations.push(
            "Your productive browsing time was fairly low today. Try scheduling one focused work or study block tomorrow."
        )
    }

    if (neutralTime > productiveTime && neutralTime > unproductiveTime) {
        recommendations.push(
            "A large part of your browsing time was spent on neutral websites. Review whether that time is supporting your goals."
        )
    }

    if (recommendations.length === 0) {
        recommendations.push(
            "Your browsing activity looked fairly balanced today. Keep building consistent habits."
        )
    }

    return recommendations.slice(0, 3)
}