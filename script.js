const themeToggle = document.getElementById("themeToggle");
const themeToggleIcon = document.getElementById("themeToggleIcon");
const themeColorMeta = document.getElementById("themeColorMeta");
const logoutButton = document.getElementById("logoutButton");
const arcadePage = document.querySelector(".arcade-page");
const hubCard = document.querySelector(".hub-card");

const THEME_KEY = "zero-arcade-theme";
const ACCESS_KEY = "zero-arcade-access";
const ACCOUNT_KEY = "zero-arcade-account";
const ROLE_KEY = "zero-arcade-role";
const PROFILE_PREFIX = "zero-arcade-profile:";

let serverSession = null;

function getProfileKey(email) {
    return `${PROFILE_PREFIX}${email.toLowerCase()}`;
}

async function loadServerSession() {
    try {
        const response = await fetch(
            "/api/auth/session",
            {
                method: "GET",
                headers: {
                    Accept: "application/json"
                },
                credentials: "same-origin",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            return null;
        }

        const result = await response.json();

        if (
            !result?.authenticated ||
            !result.account?.email
        ) {
            return null;
        }

        return result;
    } catch {
        return null;
    }
}

window.zeroArcadeSessionReady =
    loadServerSession().then((session) => {
        serverSession = session;
        window.zeroArcadeSession = session;
        return session;
    });

function getCurrentAccountEmail() {
    return (
        serverSession?.account?.email
            ?.trim()
            .toLowerCase() || ""
    );
}

function getCurrentAccountRole() {
    return (
        serverSession?.account?.role || ""
    );
}

function getCurrentProfile() {
    const email = getCurrentAccountEmail();

    if (!email) {
        return null;
    }

    try {
        const profile = JSON.parse(
            localStorage.getItem(
                getProfileKey(email)
            ) || "null"
        );

        if (
            !profile ||
            typeof profile !== "object" ||
            !profile.tag
        ) {
            return null;
        }

        return profile;
    } catch {
        return null;
    }
}

function hasCurrentProfile() {
    return Boolean(getCurrentProfile());
}

function getProfileInitial(tag) {
    return (tag || "Z")
        .charAt(0)
        .toUpperCase();
}

function updateProfileAvatar(profile) {
    const profileEntryAvatar =
        document.getElementById(
            "profileEntryAvatar"
        );

    const profileEntryImage =
        document.getElementById(
            "profileEntryImage"
        );

    const profileEntryFallback =
        profileEntryAvatar?.querySelector(
            ".profile-entry-fallback"
        );

    if (
        !profileEntryAvatar ||
        !profileEntryImage ||
        !profileEntryFallback
    ) {
        return;
    }

    const hasAvatar =
        Boolean(profile?.avatar);

    profileEntryFallback.textContent =
        getProfileInitial(profile?.tag);

    if (hasAvatar) {
        profileEntryImage.src =
            profile.avatar;

        profileEntryImage.hidden =
            false;

        profileEntryFallback.hidden =
            true;
    } else {
        profileEntryImage.removeAttribute(
            "src"
        );

        profileEntryImage.hidden =
            true;

        profileEntryFallback.hidden =
            false;
    }
}

function updateProfileEntry() {
    const profileEntry =
        document.getElementById(
            "profileEntry"
        );

    const profileEntryTitle =
        document.getElementById(
            "profileEntryTitle"
        );

    const profileEntrySubtitle =
        document.getElementById(
            "profileEntrySubtitle"
        );

    if (
        !profileEntry ||
        !profileEntryTitle ||
        !profileEntrySubtitle
    ) {
        return;
    }

    const profile =
        getCurrentProfile();

    const role =
        getCurrentAccountRole() ||
        "PLAYER";

    updateProfileAvatar(profile);

    if (!profile) {
        profileEntryTitle.textContent =
            role === "DEVELOPER"
                ? "Developer Profile"
                : "Create Arcade Profile";

        profileEntrySubtitle.textContent =
            role === "DEVELOPER"
                ? "View your verified developer identity."
                : "Set your Arcade Tag before you start.";

        return;
    }

    profileEntryTitle.textContent =
        profile.tag;

    if (role === "DEVELOPER") {
        profileEntrySubtitle.textContent =
            "Verified developer identity.";

        return;
    }

    profileEntrySubtitle.textContent =
        "View or update your Arcade identity.";
}

async function protectArcade() {
    if (!hubCard) {
        return;
    }

    const session =
        await window.zeroArcadeSessionReady;

    if (!session) {
        window.location.replace(
            "auth/login.html"
        );

        return;
    }

    if (!hasCurrentProfile()) {
        window.location.replace(
            "profile/index.html"
        );

        return;
    }

    updateProfileEntry();
}

function applyTheme(theme) {
    const isDark =
        theme === "dark";

    document.documentElement.dataset.theme =
        isDark
            ? "dark"
            : "light";

    if (themeToggleIcon) {
        themeToggleIcon.textContent =
            isDark
                ? "\u2600"
                : "\u263E";
    }

    if (themeToggle) {
        themeToggle.setAttribute(
            "aria-label",
            isDark
                ? "Switch to light mode"
                : "Switch to dark mode"
        );
    }

    if (themeColorMeta) {
        themeColorMeta.setAttribute(
            "content",
            isDark
                ? "#0d0d0d"
                : "#f5f5f3"
        );
    }
}

function getInitialTheme() {
    const savedTheme =
        localStorage.getItem(
            THEME_KEY
        );

    if (
        savedTheme === "dark" ||
        savedTheme === "light"
    ) {
        return savedTheme;
    }

    return "light";
}

function toggleTheme() {
    const currentTheme =
        document.documentElement
            .dataset.theme ||
        "light";

    const nextTheme =
        currentTheme === "dark"
            ? "light"
            : "dark";

    localStorage.setItem(
        THEME_KEY,
        nextTheme
    );

    applyTheme(nextTheme);
}

async function handleLogout() {
    if (!logoutButton) {
        return;
    }

    logoutButton.classList.add(
        "is-logging-out"
    );

    arcadePage?.classList.add(
        "is-logging-out"
    );

    try {
        await fetch(
            "/api/auth/logout",
            {
                method: "POST",
                headers: {
                    Accept: "application/json"
                },
                credentials: "same-origin",
                cache: "no-store"
            }
        );
    } finally {
        sessionStorage.removeItem(
            ACCESS_KEY
        );

        sessionStorage.removeItem(
            ACCOUNT_KEY
        );

        sessionStorage.removeItem(
            ROLE_KEY
        );

        window.location.replace(
            "auth/login.html"
        );
    }
}

applyTheme(
    getInitialTheme()
);

protectArcade();

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