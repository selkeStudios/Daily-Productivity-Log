import test from "node:test";
import assert from "node:assert/strict";

import { __testables, sendDailyProductivityEmail } from "../services/emailService.js";

function createChromeMock({
    productivityData = [],
    lastUpdated = null,
    email = "user@example.com",
    token = "fake-token",
} = {}) {
    return {
        storage: {
            local: {
                get(keys, callback) {
                    const response = {};
                    if (Array.isArray(keys) && keys.includes("googleAuthEmailId")) {
                        response.googleAuthEmailId = email;
                    }
                    if (Array.isArray(keys) && keys.includes("productivityData")) {
                        response.productivityData = productivityData;
                        response.lastUpdated = lastUpdated;
                    }
                    callback(response);
                },
            },
        },
        identity: {
            getAuthToken(_opts, callback) {
                callback(token);
            },
        },
        runtime: {
            lastError: null,
        },
    };
}

test("buildEmailBody includes browsing section and AI summary", () => {
    const body = __testables.buildEmailBody(
        [["github.com", 3600000], ["youtube.com", 600000]],
        "Keep your focus blocks shorter and more frequent.",
        Date.UTC(2026, 4, 1)
    );

    assert.match(body, /YOUR BROWSING ACTIVITY/);
    assert.match(body, /github\.com: 1h 0m 0s/);
    assert.match(body, /youtube\.com: 10m 0s/);
    assert.match(body, /AI PRODUCTIVITY ANALYSIS/);
    assert.match(body, /Keep your focus blocks shorter and more frequent\./);
});

test("buildEmailBody falls back to tip when AI summary missing", () => {
    const body = __testables.buildEmailBody([], null, null);
    assert.match(body, /No browsing activity recorded/);
    assert.match(body, /Check your browsing habits regularly/);
});

test("sendDailyProductivityEmail sends gmail message for signed-in user", async () => {
    const originalChrome = globalThis.chrome;
    const originalFetch = globalThis.fetch;

    const fetchCalls = [];
    globalThis.chrome = createChromeMock({ productivityData: [], email: "student@example.com" });
    globalThis.fetch = async (url, options) => {
        fetchCalls.push({ url, options });
        return {
            ok: true,
            status: 200,
            text: async () => "",
            json: async () => ({}),
        };
    };

    try {
        await sendDailyProductivityEmail();
        assert.equal(fetchCalls.length, 1);
        assert.equal(fetchCalls[0].url, "https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
        assert.equal(fetchCalls[0].options.method, "POST");
        assert.match(fetchCalls[0].options.headers.Authorization, /^Bearer /);
    } finally {
        globalThis.chrome = originalChrome;
        globalThis.fetch = originalFetch;
    }
});

test("sendDailyProductivityEmail exits early when no stored email", async () => {
    const originalChrome = globalThis.chrome;
    const originalFetch = globalThis.fetch;
    const originalConsoleError = console.error;

    let fetchCalled = false;
    let loggedError = "";
    globalThis.chrome = createChromeMock({ email: "" });
    globalThis.fetch = async () => {
        fetchCalled = true;
        throw new Error("should not be called");
    };
    console.error = (...args) => {
        loggedError = args.map(String).join(" ");
    };

    try {
        await sendDailyProductivityEmail();
        assert.equal(fetchCalled, false);
        assert.match(loggedError, /Error sending email/);
    } finally {
        globalThis.chrome = originalChrome;
        globalThis.fetch = originalFetch;
        console.error = originalConsoleError;
    }
});
