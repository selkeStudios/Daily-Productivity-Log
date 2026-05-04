"use strict"

const GOOGLE_AUTH_SIGNED_IN_KEY = "googleAuthSignedIn"
const GOOGLE_AUTH_EMAIL_KEY = "googleAuthEmailId"

export function getAuthTokenInteractive() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError || !token) {
                reject(new Error(chrome.runtime.lastError?.message || "Google sign-in failed."))
                return
            }
            resolve(token)
        })
    })
}

export function getAuthTokenSilent() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (chrome.runtime.lastError || !token) {
                reject(new Error(chrome.runtime.lastError?.message || "Not signed in."))
                return
            }
            resolve(token)
        })
    })
}

function getProfileEmail() {
    return new Promise((resolve) => {
        chrome.identity.getProfileUserInfo((profileInfo) => {
            if (chrome.runtime.lastError) {
                resolve("")
                return
            }
            resolve((profileInfo?.email || "").trim())
        })
    })
}

export async function signInWithGoogle() {
    await getAuthTokenInteractive()
    const emailId = await getProfileEmail()
    if (!emailId) {
        throw new Error("Could not read Google email. Please allow account access and try again.")
    }

    await chrome.storage.local.set({
        [GOOGLE_AUTH_SIGNED_IN_KEY]: true,
        [GOOGLE_AUTH_EMAIL_KEY]: emailId
    })
    return { signedIn: true, emailId }
}

export function signOutGoogle() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            const clearStorageAndFinish = () => {
                chrome.storage.local.remove([GOOGLE_AUTH_SIGNED_IN_KEY, GOOGLE_AUTH_EMAIL_KEY], () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message))
                        return
                    }
                    resolve()
                })
            }

            if (chrome.runtime.lastError || !token) {
                clearStorageAndFinish()
                return
            }

            chrome.identity.removeCachedAuthToken({ token }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message))
                    return
                }
                clearStorageAndFinish()
            })
        })
    })
}

export async function getGoogleAuthState() {
    const stored = await chrome.storage.local.get([GOOGLE_AUTH_SIGNED_IN_KEY, GOOGLE_AUTH_EMAIL_KEY])
    const emailId = (stored[GOOGLE_AUTH_EMAIL_KEY] || "").trim()
    if (!emailId) {
        return { signedIn: false, emailId: "" }
    }

    try {
        await getAuthTokenSilent()
        return { signedIn: true, emailId }
    } catch {
        await chrome.storage.local.remove([GOOGLE_AUTH_SIGNED_IN_KEY, GOOGLE_AUTH_EMAIL_KEY])
        return { signedIn: false, emailId: "" }
    }
}
