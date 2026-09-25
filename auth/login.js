const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const loginCard = document.querySelector(".login-card");
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");
const emailInput = document.getElementById("email");

const PLAYER_EMAIL = "player@zeroarcade.com";
const DEVELOPER_EMAIL = "zero.dev@zeroarcade.com";
const DEVELOPER_PASSWORD = "zero@2006";

const PLAYER_ACCOUNT_KEY = "zero-arcade-player-account";
const PLAYER_PASSWORD_LENGTH = 14;

let loadingInterval = null;
let redirectTimeout = null;

function generateRandomPassword() {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const numbers = "23456789";
    const alphabet = letters + numbers;

    const requiredCharacters = [
        letters.charAt(Math.floor(Math.random() * letters.length)),
        letters.charAt(Math.floor(Math.random() * letters.length)),
        numbers.charAt(Math.floor(Math.random() * numbers.length))
    ];

    const remainingLength =
        PLAYER_PASSWORD_LENGTH - requiredCharacters.length;

    if (window.crypto?.getRandomValues) {
        const values = new Uint32Array(remainingLength);
        window.crypto.getRandomValues(values);

        for (let index = 0; index < values.length; index += 1) {
            requiredCharacters.push(
                alphabet.charAt(values[index] % alphabet.length)
            );
        }
    } else {
        for (let index = 0; index < remainingLength; index += 1) {
            requiredCharacters.push(
                alphabet.charAt(
                    Math.floor(Math.random() * alphabet.length)
                )
            );
        }
    }

    for (let index = requiredCharacters.length - 1; index > 0; index -= 1) {
        let randomIndex;

        if (window.crypto?.getRandomValues) {
            const values = new Uint32Array(1);
            window.crypto.getRandomValues(values);
            randomIndex = values[0] % (index + 1);
        } else {
            randomIndex = Math.floor(Math.random() * (index + 1));
        }

        const temporary = requiredCharacters[index];
        requiredCharacters[index] = requiredCharacters[randomIndex];
        requiredCharacters[randomIndex] = temporary;
    }

    return requiredCharacters.join("");
}

function isValidStoredPlayerAccount(account) {
    return Boolean(
        account &&
        typeof account === "object" &&
        account.email === PLAYER_EMAIL &&
        typeof account.password === "string" &&
        account.password.length === PLAYER_PASSWORD_LENGTH
    );
}

function getPlayerAccount() {
    try {
        const storedAccount = JSON.parse(
            localStorage.getItem(PLAYER_ACCOUNT_KEY) || "null"
        );

        if (isValidStoredPlayerAccount(storedAccount)) {
            return storedAccount;
        }
    } catch {
        return null;
    }

    return null;
}

function createPlayerAccount() {
    const account = {
        email: PLAYER_EMAIL,
        password: generateRandomPassword(),
        createdAt: new Date().toISOString()
    };

    try {
        localStorage.setItem(
            PLAYER_ACCOUNT_KEY,
            JSON.stringify(account)
        );
        return account;
    } catch {
        return null;
    }
}

function getOrCreatePlayerAccount() {
    const existingAccount = getPlayerAccount();

    if (existingAccount) {
        return existingAccount;
    }

    return createPlayerAccount();
}

function initializePlayerCredentials() {
    if (!emailInput || !passwordInput) {
        return;
    }

    const account = getOrCreatePlayerAccount();

    if (!account) {
        passwordInput.value = "";
        return;
    }

    if (!emailInput.value.trim()) {
        emailInput.value = PLAYER_EMAIL;
    }

    passwordInput.value = account.password;
}

function hasProfile(email) {
    if (!email) {
        return false;
    }

    try {
        const profile = JSON.parse(
            localStorage.getItem(getProfileKey(email)) || "null"
        );

        return Boolean(
            profile &&
            typeof profile === "object" &&
            profile.tag &&
            typeof profile.tag === "string"
        );
    } catch {
        return false;
    }
}

function getAccountRole(email) {
    return email === DEVELOPER_EMAIL ? "DEVELOPER" : "PLAYER";
}

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

    if (loginButton) {
        loginButton.disabled = false;
        loginButton.classList.remove("is-loading", "is-granted");
    }

    setMessage(message, "error");
}

function stopLoadingAnimation() {
    if (loadingInterval) {
        window.clearInterval(loadingInterval);
        loadingInterval = null;
    }
}

function clearRedirectTimer() {
    if (redirectTimeout) {
        window.clearTimeout(redirectTimeout);
        redirectTimeout = null;
    }
}

function showLoadingState() {
    if (!loginButton) {
        return;
    }

    stopLoadingAnimation();

    loginButton.classList.remove("is-granted");
    loginButton.classList.add("is-loading");
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

function showGrantedState(role) {
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
        buttonText.textContent =
            role === "DEVELOPER"
                ? "DEVELOPER ACCESS"
                : "ACCESS GRANTED";
    }

    if (buttonArrow) {
        buttonArrow.textContent = "✓";
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
    if (hasProfile(email)) {
        return "../index.html";
    }

    return "../profile/index.html";
}

function startUnlockSequence(email) {
    if (!loginCard) {
        return;
    }

    clearRedirectTimer();

    loginCard.classList.add("is-unlocking");

    window.setTimeout(() => {
        if (loginCard) {
            loginCard.classList.add("is-exiting");
        }
    }, 940);

    redirectTimeout = window.setTimeout(() => {
        window.location.replace(getDestination(email));
    }, 1320);
}

function authenticate(email, password) {
    if (email === PLAYER_EMAIL) {
        const playerAccount = getPlayerAccount();

        if (
            playerAccount &&
            password === playerAccount.password
        ) {
            return "PLAYER";
        }

        return null;
    }

    if (
        email === DEVELOPER_EMAIL &&
        password === DEVELOPER_PASSWORD
    ) {
        return "DEVELOPER";
    }

    return null;
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

        const buttonText = loginButton.querySelector(".login-button-text");
        const buttonArrow = loginButton.querySelector(".login-button-arrow");

        if (buttonText) {
            buttonText.textContent = "LOGIN";
        }

        if (buttonArrow) {
            buttonArrow.textContent = "↗";
        }
    }
}

function handleLogin(event) {
    event.preventDefault();

    if (
        loginButton?.classList.contains("is-loading") ||
        loginCard?.classList.contains("is-unlocking")
    ) {
        return;
    }

    resetLoginState();
    setMessage("");

    const email = emailInput?.value.trim().toLowerCase() || "";
    const password = passwordInput?.value || "";

    if (!email || !password) {
        triggerLoginError("ENTER YOUR LOGIN DETAILS");
        return;
    }

    const role = authenticate(email, password);

    if (!role) {
        triggerLoginError("INVALID CREDENTIALS");
        return;
    }

    const accountRole = getAccountRole(email);

    sessionStorage.setItem(ACCESS_KEY, "granted");
    sessionStorage.setItem(ACCOUNT_KEY, email);
    sessionStorage.setItem(ROLE_KEY, accountRole);

    showLoadingState();

    window.setTimeout(() => {
        showGrantedState(role);
    }, 1050);

    window.setTimeout(() => {
        startUnlockSequence(email);
    }, 1250);
}

if (passwordToggle) {
    passwordToggle.addEventListener("click", togglePassword);
}

if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
}

resetLoginState();
initializePlayerCredentials();