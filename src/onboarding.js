"use strict"

function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message))
                return
            }
            resolve(response)
        })
    })
}

function setAuthStatus(message, isError = false) {
    const el = document.getElementById("authStatus")
    el.textContent = message
    el.classList.toggle("error", isError)
}

function showDoneStep() {
    document.getElementById("auth-step").classList.add("hidden")
    document.getElementById("done-step").classList.remove("hidden")
}

document.getElementById("loginGoogle").addEventListener("click", async () => {
    const btn = document.getElementById("loginGoogle")
    btn.disabled = true
    setAuthStatus("Opening Google sign-in…")

    try {
        const response = await sendRuntimeMessage({ type: "GOOGLE_SIGN_IN" })
        if (!response?.ok || !response.emailId) {
            throw new Error(response?.error || "Sign-in failed.")
        }
        setAuthStatus("")
        showDoneStep()
    } catch (error) {
        setAuthStatus(error.message, true)
    } finally {
        btn.disabled = false
    }
})

document.getElementById("closeTabBtn").addEventListener("click", () => {
    window.close()
})
