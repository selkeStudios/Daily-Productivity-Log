import test from "node:test";
import assert from "node:assert/strict";

function installMinimalDocumentStub() {
    const map = new Map();
    globalThis.document = {
        getElementById(id) {
            if (!map.has(id)) {
                map.set(id, {
                    id,
                    disabled: false,
                    textContent: "",
                    innerText: "",
                    classList: {
                        add() {},
                        remove() {},
                        toggle() {},
                    },
                    addEventListener() {},
                });
            }
            return map.get(id);
        },
        createElement() {
            return {
                appendChild() {},
                style: {},
                innerHTML: "",
                innerText: "",
            };
        },
        addEventListener() {},
    };
}

test("handleLoginGoogleClick transitions to main view on success", async () => {
    installMinimalDocumentStub();
    const { handleLoginGoogleClick } = await import(`../popup.js?test=${Date.now()}`);

    const loginBtn = { disabled: false };
    const statusCalls = [];
    let showMainCalled = false;
    let loadMainCalled = false;

    await handleLoginGoogleClick({
        loginBtn,
        setAuthStatusFn: (message, isError = false) => statusCalls.push({ message, isError }),
        sendRuntimeMessageFn: async () => ({ ok: true, emailId: "user@example.com" }),
        showMainViewFn: () => {
            showMainCalled = true;
        },
        loadMainDashboardFn: async () => {
            loadMainCalled = true;
        },
    });

    assert.equal(showMainCalled, true);
    assert.equal(loadMainCalled, true);
    assert.equal(loginBtn.disabled, false);
    assert.deepEqual(statusCalls[0], { message: "Opening Google sign-in…", isError: false });
    assert.deepEqual(statusCalls[1], { message: "", isError: false });
});

test("handleLoginGoogleClick reports sign-in failure", async () => {
    installMinimalDocumentStub();
    const { handleLoginGoogleClick } = await import(`../popup.js?test=${Date.now()}`);

    const loginBtn = { disabled: false };
    const statusCalls = [];

    await handleLoginGoogleClick({
        loginBtn,
        setAuthStatusFn: (message, isError = false) => statusCalls.push({ message, isError }),
        sendRuntimeMessageFn: async () => ({ ok: false, error: "Popup auth rejected" }),
        showMainViewFn: () => {
            throw new Error("showMainView should not be called");
        },
        loadMainDashboardFn: async () => {
            throw new Error("loadMainDashboard should not be called");
        },
    });

    assert.equal(loginBtn.disabled, false);
    assert.deepEqual(statusCalls[0], { message: "Opening Google sign-in…", isError: false });
    assert.deepEqual(statusCalls[1], { message: "Popup auth rejected", isError: true });
});
