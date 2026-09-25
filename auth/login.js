const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const loginCard = document.querySelector(".login-card");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");
const emailInput = document.getElementById("email");

let loadingInterval = null;
let redirectTimeout = null;

function getCurrentProfile(email) {
    if (!email) {
        return null;
    }

    try {
        const key = getProfileKey(email);
        return JSON.parse(
            localStorage.getItem(key) || "null"
        );
    } catch {
        return null;
    }
}

function hasProfile(email) {
    const profile = getCurrentProfile(email);

    return Boolean(
        profile &&
        typeof profile === "object" &&
        profile.tag &&
        typeof profile.tag === "string"
    );
}

function setMessage(message, type = "") {
    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = message;
    loginMessage.className = "login-message";

    if (type) {
        loginMessage.classList.add(
            `is-${type}`
        );
    }
}

function togglePassword() {
    if (
        !passwordInput ||
        !passwordToggle
    ) {
        return;
    }

    const shouldShow =
        passwordInput.type === "password";

    passwordInput.type =
        shouldShow ? "text" : "password";

    passwordToggle.setAttribute(
        "aria-label",
        shouldShow
            ? "Hide password"
            : "Show password"
    );

    passwordToggle.setAttribute(
        "aria-pressed",
        String(shouldShow)
    );
}

function triggerLoginError(message) {
    if (loginForm) {
        loginForm.classList.remove(
            "is-error"
        );

        void loginForm.offsetWidth;

        loginForm.classList.add(
            "is-error"
        );
    }

    if (loginButton) {
        loginButton.disabled = false;
        loginButton.classList.remove(
            "is-loading",
            "is-granted"
        );

        const buttonText =
            loginButton.querySelector(
                ".login-button-text"
            );

        const buttonArrow =
            loginButton.querySelector(
                ".login-button-arrow"
            );

        if (buttonText) {
            buttonText.textContent =
                "LOGIN";
        }

        if (buttonArrow) {
            buttonArrow.textContent =
                "↙";
        }
    }

    setMessage(
        message,
        "error"
    );
}

function stopLoadingAnimation() {
    if (loadingInterval) {
        window.clearInterval(
            loadingInterval
        );

        loadingInterval = null;
    }
}

function clearRedirectTimer() {
    if (redirectTimeout) {
        window.clearTimeout(
            redirectTimeout
        );

        redirectTimeout = null;
    }
}

function showLoadingState() {
    if (!loginButton) {
        return;
    }

    stopLoadingAnimation();

    loginButton.classList.remove(
        "is-granted"
    );

    loginButton.classList.add(
        "is-loading"
    );

    loginButton.disabled = true;

    const buttonText =
        loginButton.querySelector(
            ".login-button-text"
        );

    if (!buttonText) {
        return;
    }

    const states = [
        "AUTHENTICATING .",
        "AUTHENTICATING . .",
        "AUTHENTICATING . . .",
        "AUTHENTICATING . . . ."
    ];

    let stateIndex = 0;

    buttonText.textContent =
        states[stateIndex];

    loadingInterval =
        window.setInterval(() => {
            stateIndex =
                (stateIndex + 1) %
                states.length;

            buttonText.textContent =
                states[stateIndex];
        }, 230);
}

function createUnlockFrame() {
    if (
        !loginCard ||
        loginCard.querySelector(
            ".unlock-frame"
        )
    ) {
        return;
    }

    const frame =
        document.createElement("div");

    frame.className =
        "unlock-frame";

    frame.setAttribute(
        "aria-hidden",
        "true"
    );

    frame.innerHTML = `
        <svg class="unlock-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <rect class="unlock-track" x="1" y="1" width="98" height="98" rx="3"></rect>
        </svg>
        <span class="unlock-corner unlock-corner-tl"></span>
        <span class="unlock-corner unlock-corner-tr"></span>
        <span class="unlock-corner unlock-corner-br"></span>
        <span class="unlock-corner unlock-corner-bl"></span>
        <span class="unlock-core"></span>
    `;

    loginCard.appendChild(
        frame
    );
}

function showGrantedState(role) {
    if (
        !loginButton ||
        !loginCard
    ) {
        return;
    }

    stopLoadingAnimation();

    loginButton.classList.remove(
        "is-loading"
    );

    loginButton.classList.add(
        "is-granted"
    );

    loginCard.classList.add(
        "is-success"
    );

    const buttonText =
        loginButton.querySelector(
            ".login-button-text"
        );

    const buttonArrow =
        loginButton.querySelector(
            ".login-button-arrow"
        );

    if (buttonText) {
        buttonText.textContent =
            role === "DEVELOPER"
                ? "DEVELOPER ACCESS"
                : "ACCESS GRANTED";
    }

    if (buttonArrow) {
        buttonArrow.textContent =
            "✓";
    }

    setMessage(
        role === "DEVELOPER"
            ? "WELCOME, DEVELOPER"
            : "WELCOME TO ZERO ARCADE",
        "success"
    );

    createUnlockFrame();
}

function getDestination(email) {
    return hasProfile(email)
        ? "../index.html"
        : "../profile/index.html";
}

function startUnlockSequence(email) {
    if (!loginCard) {
        return;
    }

    clearRedirectTimer();

    loginCard.classList.add(
        "is-unlocking"
    );

    window.setTimeout(() => {
        if (loginCard) {
            loginCard.classList.add(
                "is-exiting"
            );
        }
    }, 940);

    redirectTimeout =
        window.setTimeout(() => {
            window.location.replace(
                getDestination(email)
            );
        }, 1320);
}

function resetLoginState() {
    stopLoadingAnimation();
    clearRedirectTimer();

    if (loginCard) {
        loginCard.classList.remove(
            "is-error",
            "is-success",
            "is-unlocking",
            "is-exiting"
        );
    }

    if (loginButton) {
        loginButton.disabled = false;

        loginButton.classList.remove(
            "is-loading",
            "is-granted"
        );

        const buttonText =
            loginButton.querySelector(
                ".login-button-text"
            );

        const buttonArrow =
            loginButton.querySelector(
                ".login-button-arrow"
            );

        if (buttonText) {
            buttonText.textContent =
                "LOGIN";
        }

        if (buttonArrow) {
            buttonArrow.textContent =
                "↙";
        }
    }
}

async function handleLogin(event) {
    event.preventDefault();

    if (
        loginButton?.classList.contains(
            "is-loading"
        ) ||
        loginCard?.classList.contains(
            "is-unlocking"
        )
    ) {
        return;
    }

    resetLoginState();
    setMessage("");

    const email =
        emailInput?.value.trim().toLowerCase() ||
        "";

    const password =
        passwordInput?.value || "";

    if (!email || !password) {
        triggerLoginError(
            "ENTER YOUR LOGIN DETAILS"
        );
        return;
    }

    showLoadingState();

    let response;

    try {
        response = await fetch(
            "/api/auth/login",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                    "Accept":
                        "application/json"
                },
                credentials:
                    "same-origin",
                cache: "no-store",
                body: JSON.stringify({
                    email,
                    password
                })
            }
        );
    } catch {
        triggerLoginError(
            "AUTHENTICATION SERVER UNAVAILABLE"
        );
        return;
    }

    let result = null;

    try {
        result = await response.json();
    } catch {
        triggerLoginError(
            "AUTHENTICATION SERVER ERROR"
        );
        return;
    }

    if (
        !response.ok ||
        !result?.ok ||
        !result?.account
    ) {
        const errorMessages = {
            INVALID_CREDENTIALS:
                "INVALID CREDENTIALS",
            ACCOUNT_SUSPENDED:
                "ACCOUNT SUSPENDED",
            DEVICE_BOUND:
                "DEVICE ALREADY REGISTERED",
            DEVICE_REVOKED:
                "DEVICE ACCESS REVOKED",
            INVALID_REQUEST:
                "ENTER YOUR LOGIN DETAILS"
        };

        triggerLoginError(
            errorMessages[result?.error] ||
            "AUTHENTICATION FAILED"
        );

        return;
    }

    const accountEmail =
        result.account.email;

    const accountRole =
        result.account.role;

    window.zeroArcadeSession = {
        authenticated: true,
        account: result.account,
        expiresAt:
            result.expiresAt
    };

    sessionStorage.setItem(
        ACCESS_KEY,
        "granted"
    );

    sessionStorage.setItem(
        ACCOUNT_KEY,
        accountEmail
    );

    sessionStorage.setItem(
        ROLE_KEY,
        accountRole
    );

    showGrantedState(
        accountRole
    );

    window.setTimeout(() => {
        startUnlockSequence(
            accountEmail
        );
    }, 1250);
}

if (passwordToggle) {
    passwordToggle.addEventListener(
        "click",
        togglePassword
    );
}

if (loginForm) {
    loginForm.addEventListener(
        "submit",
        handleLogin
    );
}

resetLoginState();