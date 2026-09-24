const themeToggle = document.getElementById("themeToggle");
const themeToggleIcon = document.getElementById("themeToggleIcon");
const themeColorMeta = document.getElementById("themeColorMeta");
const logoutButton = document.getElementById("logoutButton");
const arcadePage = document.querySelector(".arcade-page");

const THEME_KEY = "zero-arcade-theme";
const ACCESS_KEY = "zero-arcade-access";

function applyTheme(theme) {
    const isDark = theme === "dark";

    document.documentElement.dataset.theme = isDark ? "dark" : "light";

    if (themeToggleIcon) {
        themeToggleIcon.textContent = isDark ? "☀" : "☾";
    }

    if (themeToggle) {
        themeToggle.setAttribute(
            "aria-label",
            isDark ? "Switch to light mode" : "Switch to dark mode"
        );
    }

    if (themeColorMeta) {
        themeColorMeta.setAttribute(
            "content",
            isDark ? "#0d0d0d" : "#f5f5f3"
        );
    }
}

function getInitialTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);

    if (savedTheme === "dark" || savedTheme === "light") {
        return savedTheme;
    }

    return "light";
}

function toggleTheme() {
    const currentTheme =
        document.documentElement.dataset.theme || "light";

    const nextTheme =
        currentTheme === "dark" ? "light" : "dark";

    localStorage.setItem(
        THEME_KEY,
        nextTheme
    );

    applyTheme(nextTheme);
}

function handleLogout() {
    if (!logoutButton) {
        return;
    }

    logoutButton.classList.add("is-logging-out");
    arcadePage?.classList.add("is-logging-out");

    sessionStorage.removeItem(ACCESS_KEY);

    window.setTimeout(() => {
        window.location.replace("login.html");
    }, 350);
}

applyTheme(getInitialTheme());

if (themeToggle) {
    themeToggle.addEventListener(
        "click",
        toggleTheme
    );
}

if (logoutButton) {
    logoutButton.addEventListener(
        "click",
        handleLogout
    );
}