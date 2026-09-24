const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const loginCard = document.querySelector(".login-card");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");

const DEMO_EMAIL = "player@zeroarcade.com";
const DEMO_PASSWORD = "zero123";

let loadingInterval = null;

function setMessage(message, type = "") {
    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = message;
    loginMessage.className = "login-message";

    if (type) {
        loginMessage.classList.add(`is-${type}`);
    }
}

function togglePassword() {
    if (!passwordInput || !passwordToggle) {
        return;
    }

    const shouldShow = passwordInput.type === "password";

    passwordInput.type = shouldShow ? "text" : "password";

    passwordToggle.setAttribute(
        "aria-label",
        shouldShow ? "Hide password" : "Show password"
    );

    passwordToggle.setAttribute(
        "aria-pressed",
        String(shouldShow)
    );
}

function triggerLoginError(message) {
    if (loginForm) {
        loginForm.classList.remove("is-error");
        void loginForm.offsetWidth;
        loginForm.classList.add("is-error");
    }

    setMessage(message, "error");
}

function stopLoadingAnimation() {
    if (loadingInterval) {
        window.clearInterval(loadingInterval);
        loadingInterval = null;
    }
}

function showLoadingState() {
    if (!loginButton) {
        return;
    }

    stopLoadingAnimation();

    loginButton.classList.add("is-loading");
    loginButton.classList.remove("is-granted");
    loginButton.disabled = true;

    const buttonText = loginButton.querySelector(".login-button-text");

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

    buttonText.textContent = states[stateIndex];

    loadingInterval = window.setInterval(() => {
        stateIndex = (stateIndex + 1) % states.length;
        buttonText.textContent = states[stateIndex];
    }, 230);
}

function createUnlockFrame() {
    if (!loginCard || loginCard.querySelector(".unlock-frame")) {
        return;
    }

    const frame = document.createElement("div");
    frame.className = "unlock-frame";
    frame.setAttribute("aria-hidden", "true");

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

    loginCard.appendChild(frame);
}

function showGrantedState() {
    if (!loginButton || !loginCard) {
        return;
    }

    stopLoadingAnimation();

    loginButton.classList.remove("is-loading");
    loginButton.classList.add("is-granted");
    loginCard.classList.add("is-success");

    const buttonText = loginButton.querySelector(".login-button-text");
    const buttonArrow = loginButton.querySelector(".login-button-arrow");

    if (buttonText) {
        buttonText.textContent = "ACCESS GRANTED";
    }

    if (buttonArrow) {
        buttonArrow.textContent = "\u2713";
    }

    setMessage("WELCOME TO ZERO ARCADE", "success");
    createUnlockFrame();
}

function startUnlockSequence() {
    if (!loginCard) {
        return;
    }

    loginCard.classList.add("is-unlocking");

    window.setTimeout(() => {
        loginCard.classList.add("is-exiting");
    }, 940);

    window.setTimeout(() => {
        window.location.replace("../index.html");
    }, 1320);
}

function handleLogin(event) {
    event.preventDefault();

    if (
        loginButton?.classList.contains("is-loading") ||
        loginCard?.classList.contains("is-unlocking")
    ) {
        return;
    }

    const email = document.getElementById("email")?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
        triggerLoginError("ENTER YOUR LOGIN DETAILS");
        return;
    }

    if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
        triggerLoginError("INVALID CREDENTIALS");
        return;
    }

    sessionStorage.setItem(ACCESS_KEY, "granted");

    showLoadingState();

    window.setTimeout(() => {
        showGrantedState();
    }, 1050);

    window.setTimeout(() => {
        startUnlockSequence();
    }, 1250);
}

if (passwordToggle) {
    passwordToggle.addEventListener("click", togglePassword);
}

if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
}
