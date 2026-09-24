const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const loginCard = document.querySelector(".login-card");

const DEMO_EMAIL = "zero@example.com";
const DEMO_PASSWORD = "zero123";
const ACCESS_KEY = "zero-arcade-access";

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

function showGrantedState() {
    if (!loginButton || !loginCard) {
        return;
    }

    loginCard.classList.add("is-success");
    loginButton.disabled = true;
    loginButton.querySelector(".login-button-text").textContent = "ACCESS GRANTED";
    setMessage("WELCOME TO ZERO ARCADE", "success");
}

function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;

    if (!email || !password) {
        setMessage("ENTER YOUR LOGIN DETAILS", "error");
        return;
    }

    if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
        setMessage("INVALID DEMO CREDENTIALS", "error");
        return;
    }

    sessionStorage.setItem(ACCESS_KEY, "granted");
    showGrantedState();

    window.setTimeout(() => {
        loginCard?.classList.add("is-exiting");
    }, 350);

    window.setTimeout(() => {
        window.location.href = "index.html";
    }, 650);
}

if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
}