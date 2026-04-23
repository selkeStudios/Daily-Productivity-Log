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
    "w3schools.com",
    "mdn.io",
    "npmjs.com",
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
    "twitch.tv",
    "9gag.com",
]

function normalizeDomain(domain) {
    return domain.replace(/^www\./, "").toLowerCase()
}

function domainMatches(domain, target) {
    return domain === target || domain.endsWith("." + target)
}

export function getCategory(domain) {
    const normalized = normalizeDomain(domain)

    if (PRODUCTIVE_DOMAINS.some((t) => domainMatches(normalized, t))) {
        return "productive"
    }
    if (UNPRODUCTIVE_DOMAINS.some((t) => domainMatches(normalized, t))) {
        return "unproductive"
    }
    return "neutral"
}

export function summarizeByCategory(domainEntries) {
    const summary = {
        productiveTime: 0,
        unproductiveTime: 0,
        neutralTime: 0,
    }

    domainEntries.forEach(([domain, duration]) => {
        const cat = getCategory(domain)
        if (cat === "productive") summary.productiveTime += duration
        else if (cat === "unproductive") summary.unproductiveTime += duration
        else summary.neutralTime += duration
    })

    return summary
}

export function generateRecommendations(summary) {
    const { productiveTime, unproductiveTime, neutralTime } = summary
    const totalTime = productiveTime + unproductiveTime + neutralTime
    const oneHour = 60 * 60 * 1000
    const twoHours = 2 * oneHour
    const recommendations = []

    if (totalTime === 0) {
        return ["No browsing data available yet."]
    }

    if (unproductiveTime >= twoHours) {
        recommendations.push(
            "You spent over 2 hours on distracting sites today. Try setting a time limit for entertainment browsing tomorrow."
        )
    }

    if (productiveTime > unproductiveTime) {
        recommendations.push(
            "Great job — your productive browsing time outweighed distracting time today!"
        )
    }

    if (productiveTime < oneHour) {
        recommendations.push(
            "Your productive browsing was fairly low. Try scheduling one focused work or study block tomorrow."
        )
    }

    if (neutralTime > productiveTime && neutralTime > unproductiveTime) {
        recommendations.push(
            "Most of your time was on neutral sites. Consider whether that time is supporting your goals."
        )
    }

    if (recommendations.length === 0) {
        recommendations.push(
            "Your browsing looked balanced today. Keep building consistent habits!"
        )
    }

    return recommendations.slice(0, 3)
}