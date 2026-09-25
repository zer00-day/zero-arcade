const profileForm = document.getElementById("profileForm");
const arcadeTagInput = document.getElementById("arcadeTag");
const profileTag = document.getElementById("profileTag");
const profileAvatar = document.getElementById("profileAvatar");
const profileAvatarFallback = document.getElementById("profileAvatarFallback");
const profileAvatarImage = document.getElementById("profileAvatarImage");
const avatarEdit = document.getElementById("avatarEdit");
const avatarInput = document.getElementById("avatarInput");
const avatarActions = document.getElementById("avatarActions");
const changeAvatarButton = document.getElementById("changeAvatarButton");
const removeAvatarButton = document.getElementById("removeAvatarButton");
const avatarLimitStatus = document.getElementById("avatarLimitStatus");
const avatarLimitValue = document.getElementById("avatarLimitValue");
const profileMessage = document.getElementById("profileMessage");
const profileRole = document.getElementById("profileRole");
const roleValue = document.getElementById("roleValue");
const playerIdValue = document.getElementById("playerIdValue");
const profileIdentityText = document.getElementById("profileIdentityText");
const profileBackLink = document.getElementById("profileBackLink");
const profileBackLabel = document.getElementById("profileBackLabel");
const profileTopLabel = document.getElementById("profileTopLabel");
const profileTopState = document.getElementById("profileTopState");
const profileStatus = document.getElementById("profileStatus");
const formHeading = document.getElementById("formHeading");
const formDescription = document.getElementById("formDescription");
const inputWrap = document.getElementById("inputWrap");
const tagHint = document.getElementById("tagHint");
const saveButton = profileForm?.querySelector(".save-button");
const saveButtonLabel = document.getElementById("saveButtonLabel");
const profileCard = document.querySelector(".profile-card");

const DEVELOPER_EMAIL = "zero.dev@zeroarcade.com";
const DEVELOPER_TAG = "Zero DEV";
const DEVELOPER_ROLE = "DEVELOPER";
const DEVELOPER_PLAYER_ID = "ZA-000001";
const PLAYER_ROLE = "PLAYER";
const MAX_AVATAR_SIZE = 512;
const AVATAR_QUALITY = 0.84;
const INITIAL_AVATAR_CHANGES = 3;
const AVATAR_COOLDOWN_DAYS = 7;

let isSaving = false;
let isProcessingAvatar = false;
let isLeavingPage = false;

function getAccountEmail() {
    return sessionStorage.getItem(ACCOUNT_KEY) || "";
}

function getProfileKeyForCurrentAccount() {
    const email = getAccountEmail();
    return email ? getProfileKey(email) : "";
}

function loadProfile() {
    const key = getProfileKeyForCurrentAccount();

    if (!key) {
        return null;
    }

    try {
        const profile = JSON.parse(localStorage.getItem(key) || "null");

        if (!profile || typeof profile !== "object") {
            return null;
        }

        return profile;
    } catch {
        return null;
    }
}

function saveProfile(profile) {
    const key = getProfileKeyForCurrentAccount();

    if (!key) {
        return false;
    }

    try {
        localStorage.setItem(key, JSON.stringify(profile));
        return true;
    } catch {
        return false;
    }
}

function isDeveloperAccount() {
    return getAccountEmail().toLowerCase() === DEVELOPER_EMAIL;
}

function getInitial(tag) {
    return (tag || "Z").charAt(0).toUpperCase();
}

function getAvatarState(profile) {
    const used = Number.isFinite(profile?.avatarChangesUsed)
        ? Math.max(0, Math.floor(profile.avatarChangesUsed))
        : 0;

    const nextChangeAt = Number.isFinite(profile?.avatarNextChangeAt)
        ? profile.avatarNextChangeAt
        : 0;

    const now = Date.now();

    if (used >= INITIAL_AVATAR_CHANGES && nextChangeAt && now >= nextChangeAt) {
        return {
            used: INITIAL_AVATAR_CHANGES,
            available: 1,
            nextChangeAt: 0
        };
    }

    if (used < INITIAL_AVATAR_CHANGES) {
        return {
            used,
            available: INITIAL_AVATAR_CHANGES - used,
            nextChangeAt: 0
        };
    }

    return {
        used,
        available: 0,
        nextChangeAt
    };
}

function formatRemainingTime(timestamp) {
    if (!timestamp) {
        return "";
    }

    const remaining = Math.max(0, timestamp - Date.now());

    if (!remaining) {
        return "";
    }

    const totalHours = Math.ceil(remaining / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (days > 0) {
        return hours > 0
            ? `${days}D ${hours}H`
            : `${days}D`;
    }

    return `${Math.max(1, hours)}H`;
}

function updateAvatarLimitView(profile) {
    if (!avatarLimitStatus || !avatarLimitValue) {
        return;
    }

    if (isDeveloperAccount() || !profile) {
        avatarLimitStatus.hidden = true;
        return;
    }

    const state = getAvatarState(profile);

    avatarLimitStatus.hidden = !profile.avatar;

    if (state.available > 0) {
        avatarLimitValue.textContent =
            `${state.available} CHANGE${state.available === 1 ? "" : "S"} AVAILABLE`;
        return;
    }

    const remaining = formatRemainingTime(state.nextChangeAt);

    avatarLimitValue.textContent = remaining
        ? `NEXT CHANGE IN ${remaining}`
        : "NEXT CHANGE AVAILABLE SOON";
}

function triggerAvatarTransition() {
    if (!profileAvatar) {
        return;
    }

    profileAvatar.classList.remove("is-changing");
    void profileAvatar.offsetWidth;
    profileAvatar.classList.add("is-changing");

    window.setTimeout(() => {
        profileAvatar.classList.remove("is-changing");
    }, 450);
}

function triggerIdentityTransition() {
    if (!profileTag) {
        return;
    }

    profileTag.classList.remove("is-changing");
    void profileTag.offsetWidth;
    profileTag.classList.add("is-changing");

    window.setTimeout(() => {
        profileTag.classList.remove("is-changing");
    }, 280);
}

function updateAvatarView(tag, avatar = "") {
    const initial = getInitial(tag);
    const hasAvatar = Boolean(avatar);

    if (profileAvatarFallback) {
        profileAvatarFallback.textContent = initial;
        profileAvatarFallback.hidden = hasAvatar;
    }

    if (profileAvatarImage) {
        if (hasAvatar) {
            profileAvatarImage.src = avatar;
            profileAvatarImage.hidden = false;
        } else {
            profileAvatarImage.removeAttribute("src");
            profileAvatarImage.hidden = true;
        }
    }

    if (profileAvatar) {
        profileAvatar.disabled = isProcessingAvatar || hasAvatar;
        profileAvatar.setAttribute(
            "aria-label",
            hasAvatar ? "Profile photo" : "Choose profile photo"
        );
        profileAvatar.classList.toggle("has-photo", hasAvatar);
    }

    if (avatarEdit) {
        avatarEdit.hidden = hasAvatar;
    }

    if (avatarActions) {
        avatarActions.hidden = !hasAvatar;
    }

    updateAvatarLimitView(loadProfile());
}

function updateIdentity(tag, role, playerId, avatar = "") {
    const displayTag = tag || "YOUR TAG";

    if (profileTag) {
        profileTag.textContent = displayTag;
        triggerIdentityTransition();
    }

    updateAvatarView(tag, avatar);

    if (profileRole) {
        profileRole.textContent = role;
        profileRole.classList.toggle(
            "is-developer",
            role === DEVELOPER_ROLE
        );
    }

    if (roleValue) {
        roleValue.textContent = role;
    }

    if (playerIdValue) {
        playerIdValue.textContent = playerId || "ZA-000000";
    }
}

function showMessage(message, type = "") {
    if (!profileMessage) {
        return;
    }

    profileMessage.className = "profile-message";
    profileMessage.textContent = message;
    profileMessage.hidden = !message;

    if (type) {
        profileMessage.classList.add(`is-${type}`);
    }

    if (message) {
        void profileMessage.offsetWidth;
        profileMessage.classList.add("is-entering");
    }
}

function setProfileTopState(value, transition = true) {
    if (!profileTopState) {
        return;
    }

    profileTopState.innerHTML = value;

    if (!transition) {
        return;
    }

    profileTopState.classList.remove("is-transitioning");
    void profileTopState.offsetWidth;
    profileTopState.classList.add("is-transitioning");

    window.setTimeout(() => {
        profileTopState.classList.remove("is-transitioning");
    }, 420);
}

function setSavingState(saving, label = "") {
    isSaving = saving;

    if (saveButton) {
        saveButton.disabled = saving;
        saveButton.classList.toggle("is-saving", saving);
    }

    if (saveButtonLabel && label) {
        saveButtonLabel.textContent = label;
    }
}

function setSuccessButtonState() {
    if (!saveButton) {
        return;
    }

    saveButton.classList.remove("is-saving");
    saveButton.classList.add("is-success");

    window.setTimeout(() => {
        saveButton?.classList.remove("is-success");
    }, 700);
}

function setAvatarProcessing(processing) {
    isProcessingAvatar = processing;

    const profile = loadProfile();
    const hasAvatar = Boolean(profile?.avatar);

    if (profileAvatar) {
        profileAvatar.disabled = processing || hasAvatar;
    }

    if (changeAvatarButton) {
        changeAvatarButton.disabled = processing;
    }

    if (removeAvatarButton) {
        removeAvatarButton.disabled = processing;
    }

    if (!processing) {
        updateAvatarView(
            profile?.tag || "",
            profile?.avatar || ""
        );
    }
}

function isTagTaken(tag) {
    const normalizedTag = tag.toLowerCase();
    const currentKey = getProfileKeyForCurrentAccount();

    for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);

        if (
            !key ||
            !key.startsWith(PROFILE_PREFIX) ||
            key === currentKey
        ) {
            continue;
        }

        try {
            const profile = JSON.parse(
                localStorage.getItem(key) || "null"
            );

            if (
                profile?.tag &&
                typeof profile.tag === "string" &&
                profile.tag.toLowerCase() === normalizedTag
            ) {
                return true;
            }
        } catch {
            continue;
        }
    }

    return false;
}

function isPlayerIdTaken(playerId) {
    const currentKey = getProfileKeyForCurrentAccount();

    for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);

        if (
            !key ||
            !key.startsWith(PROFILE_PREFIX) ||
            key === currentKey
        ) {
            continue;
        }

        try {
            const profile = JSON.parse(
                localStorage.getItem(key) || "null"
            );

            if (profile?.playerId === playerId) {
                return true;
            }
        } catch {
            continue;
        }
    }

    return false;
}

function createPlayerId() {
    const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let attempt = 0; attempt < 100; attempt += 1) {
        let suffix = "";

        if (window.crypto?.getRandomValues) {
            const values = new Uint32Array(6);
            window.crypto.getRandomValues(values);

            for (let index = 0; index < values.length; index += 1) {
                suffix += alphabet.charAt(
                    values[index] % alphabet.length
                );
            }
        } else {
            for (let index = 0; index < 6; index += 1) {
                suffix += alphabet.charAt(
                    Math.floor(Math.random() * alphabet.length)
                );
            }
        }

        const playerId = `ZA-${suffix}`;

        if (!isPlayerIdTaken(playerId)) {
            return playerId;
        }
    }

    let fallback = Date.now()
        .toString(36)
        .toUpperCase()
        .slice(-6);

    while (fallback.length < 6) {
        fallback = `0${fallback}`;
    }

    return `ZA-${fallback}`;
}

function processAvatar(file) {
    return new Promise((resolve, reject) => {
        if (
            !file ||
            !file.type ||
            !file.type.startsWith("image/")
        ) {
            reject(new Error("INVALID_IMAGE"));
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            const image = new Image();

            image.onload = () => {
                const sourceSize = Math.min(
                    image.naturalWidth,
                    image.naturalHeight
                );

                if (!sourceSize) {
                    reject(new Error("INVALID_IMAGE"));
                    return;
                }

                const sourceX =
                    (image.naturalWidth - sourceSize) / 2;

                const sourceY =
                    (image.naturalHeight - sourceSize) / 2;

                const canvas = document.createElement("canvas");

                canvas.width = MAX_AVATAR_SIZE;
                canvas.height = MAX_AVATAR_SIZE;

                const context = canvas.getContext("2d");

                if (!context) {
                    reject(new Error("PROCESSING_FAILED"));
                    return;
                }

                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = "high";

                context.drawImage(
                    image,
                    sourceX,
                    sourceY,
                    sourceSize,
                    sourceSize,
                    0,
                    0,
                    MAX_AVATAR_SIZE,
                    MAX_AVATAR_SIZE
                );

                const result = canvas.toDataURL(
                    "image/jpeg",
                    AVATAR_QUALITY
                );

                if (!result || result.length < 100) {
                    reject(new Error("PROCESSING_FAILED"));
                    return;
                }

                resolve(result);
            };

            image.onerror = () => {
                reject(new Error("INVALID_IMAGE"));
            };

            image.src = reader.result;
        };

        reader.onerror = () => {
            reject(new Error("READ_FAILED"));
        };

        reader.readAsDataURL(file);
    });
}

function canChangeAvatar(profile) {
    if (!profile) {
        return {
            allowed: false,
            message: "CREATE YOUR PROFILE FIRST"
        };
    }

    if (isDeveloperAccount()) {
        return {
            allowed: true,
            message: ""
        };
    }

    const state = getAvatarState(profile);

    if (state.available > 0) {
        return {
            allowed: true,
            message: ""
        };
    }

    const remaining = formatRemainingTime(state.nextChangeAt);

    return {
        allowed: false,
        message: remaining
            ? `NEXT AVATAR CHANGE AVAILABLE IN ${remaining}`
            : "NEXT AVATAR CHANGE IS NOT AVAILABLE YET"
    };
}

function consumeAvatarChange(profile) {
    if (isDeveloperAccount()) {
        return profile;
    }

    const state = getAvatarState(profile);
    const now = Date.now();

    if (state.available <= 0) {
        return profile;
    }

    const nextUsed = state.used + 1;

    return {
        ...profile,
        avatarChangesUsed: nextUsed,
        avatarNextChangeAt:
            nextUsed >= INITIAL_AVATAR_CHANGES
                ? now + AVATAR_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
                : 0
    };
}

function persistAvatar(avatar) {
    const profile = loadProfile();

    if (!profile) {
        showMessage(
            "CREATE YOUR PROFILE FIRST",
            "error"
        );
        return false;
    }

    const permission = canChangeAvatar(profile);

    if (!permission.allowed) {
        showMessage(permission.message, "error");
        return false;
    }

    const updatedProfile = consumeAvatarChange({
        ...profile,
        avatar
    });

    updatedProfile.updatedAt = new Date().toISOString();

    if (!saveProfile(updatedProfile)) {
        showMessage(
            "PHOTO COULD NOT BE SAVED",
            "error"
        );
        return false;
    }

    updateIdentity(
        updatedProfile.tag,
        updatedProfile.role || PLAYER_ROLE,
        updatedProfile.playerId,
        updatedProfile.avatar || ""
    );

    triggerAvatarTransition();

    return true;
}

async function handleAvatarSelection(event) {
    const file = event.target.files?.[0];

    if (!file || isProcessingAvatar) {
        return;
    }

    const profile = loadProfile();
    const permission = canChangeAvatar(profile);

    if (!permission.allowed) {
        showMessage(permission.message, "error");

        if (avatarInput) {
            avatarInput.value = "";
        }

        return;
    }

    setAvatarProcessing(true);
    showMessage("");

    try {
        const avatar = await processAvatar(file);

        if (!persistAvatar(avatar)) {
            return;
        }

        showMessage(
            "PROFILE PHOTO UPDATED",
            "success"
        );
    } catch (error) {
        const message =
            error?.message === "INVALID_IMAGE"
                ? "PLEASE CHOOSE A VALID IMAGE"
                : "PHOTO COULD NOT BE PROCESSED";

        showMessage(message, "error");
    } finally {
        setAvatarProcessing(false);

        if (avatarInput) {
            avatarInput.value = "";
        }
    }
}

function openAvatarPicker(force = false) {
    if (
        isProcessingAvatar ||
        !avatarInput
    ) {
        return;
    }

    const profile = loadProfile();
    const hasAvatar = Boolean(profile?.avatar);

    if (hasAvatar && !force) {
        return;
    }

    const permission = canChangeAvatar(profile);

    if (!permission.allowed) {
        showMessage(permission.message, "error");
        return;
    }

    avatarInput.click();
}

function removeAvatar() {
    if (isProcessingAvatar) {
        return;
    }

    const profile = loadProfile();

    if (!profile) {
        return;
    }

    const updatedProfile = {
        ...profile,
        avatar: "",
        updatedAt: new Date().toISOString()
    };

    if (!saveProfile(updatedProfile)) {
        showMessage(
            "PHOTO COULD NOT BE REMOVED",
            "error"
        );
        return;
    }

    updateIdentity(
        updatedProfile.tag,
        updatedProfile.role || PLAYER_ROLE,
        updatedProfile.playerId,
        ""
    );

    triggerAvatarTransition();

    showMessage(
        "PROFILE PHOTO REMOVED",
        "success"
    );
}

function applyDeveloperMode() {
    if (profileForm) {
        profileForm.classList.add("is-developer");
    }

    const profile = loadProfile();

    updateIdentity(
        DEVELOPER_TAG,
        DEVELOPER_ROLE,
        DEVELOPER_PLAYER_ID,
        profile?.avatar || ""
    );

    if (arcadeTagInput) {
        arcadeTagInput.value = DEVELOPER_TAG;
        arcadeTagInput.disabled = true;
    }

    if (formHeading) {
        formHeading.hidden = true;
    }

    if (inputWrap) {
        inputWrap.hidden = true;
    }

    if (tagHint) {
        tagHint.hidden = true;
        tagHint.textContent = "";
        tagHint.classList.remove("is-developer");
    }

    if (profileBackLink) {
        profileBackLink.href = "../index.html";
        profileBackLink.setAttribute(
            "aria-label",
            "Back to Arcade"
        );
    }

    if (profileBackLabel) {
        profileBackLabel.textContent = "ARCADE";
    }

    if (profileTopLabel) {
        profileTopLabel.textContent = "DEVELOPER PROFILE";
    }

    if (profileTopState) {
        profileTopState.innerHTML =
            '<span class="verified-word">VERIFIED</span>' +
            '<span class="role-word">ROLE</span>';
    }

    if (profileStatus) {
        profileStatus.textContent = "DEVELOPER";
    }

    if (profileIdentityText) {
        profileIdentityText.textContent =
            "Your developer identity is verified and protected.";
    }

    if (profileAvatar) {
        profileAvatar.setAttribute(
            "aria-label",
            profile?.avatar
                ? "Developer profile photo"
                : "Choose developer profile photo"
        );
    }

    showMessage("");

    if (saveButtonLabel) {
        saveButtonLabel.textContent = "ENTER ARCADE";
    }

    setSavingState(false);
}

function applyPlayerMode(profile) {
    if (profileForm) {
        profileForm.classList.remove("is-developer");
    }

    if (formHeading) {
        formHeading.hidden = false;
    }

    if (inputWrap) {
        inputWrap.hidden = false;
    }

    if (arcadeTagInput) {
        arcadeTagInput.disabled = false;
        arcadeTagInput.value = profile?.tag || "";
    }

    const hasProfile = Boolean(
        profile?.tag &&
        typeof profile.tag === "string"
    );

    if (profileBackLink) {
        profileBackLink.href = hasProfile
            ? "../index.html"
            : "../auth/login.html";

        profileBackLink.setAttribute(
            "aria-label",
            hasProfile
                ? "Back to Arcade"
                : "Back to Login"
        );
    }

    if (profileBackLabel) {
        profileBackLabel.textContent =
            hasProfile
                ? "ARCADE"
                : "LOGIN";
    }

    if (profileTopLabel) {
        profileTopLabel.textContent = "ARCADE PROFILE";
    }

    if (profileTopState) {
        profileTopState.textContent =
            hasProfile
                ? "PLAYER PROFILE"
                : "FIRST SETUP";
    }

    if (profileStatus) {
        profileStatus.textContent = "PROFILE";
    }

    if (profileIdentityText) {
        profileIdentityText.textContent =
            hasProfile
                ? "Your identity inside Zero Arcade."
                : "Create your identity before entering Zero Arcade.";
    }

    if (formDescription) {
        formDescription.textContent =
            hasProfile
                ? "Update the name you want to use inside the Arcade."
                : "Choose the name you want to use inside the Arcade.";
    }

    if (tagHint) {
        tagHint.hidden = false;
        tagHint.innerHTML =
            "<strong>3–16 CHARACTERS</strong>" +
            "<span>A–Z · a–z · 0–9 · _</span>" +
            "<span>No spaces or special characters</span>";
        tagHint.classList.remove("is-developer");
    }

    if (saveButtonLabel) {
        saveButtonLabel.textContent =
            hasProfile
                ? "UPDATE PROFILE"
                : "ENTER ARCADE";
    }

    updateIdentity(
        profile?.tag || "",
        PLAYER_ROLE,
        profile?.playerId || "ZA-000000",
        profile?.avatar || ""
    );

    showMessage("");
    setSavingState(false);
}

function validateTag(tag) {
    if (tag.length < 3) {
        return "ARCADE TAG MUST BE AT LEAST 3 CHARACTERS";
    }

    if (tag.length > 16) {
        return "ARCADE TAG MUST BE 16 CHARACTERS OR LESS";
    }

    if (!/^[A-Za-z0-9_]+$/.test(tag)) {
        return "USE ONLY LETTERS, NUMBERS, AND UNDERSCORES";
    }

    return "";
}

function redirectToArcade() {
    if (isLeavingPage) {
        return;
    }

    isLeavingPage = true;

    document.body.classList.add("is-leaving");
    profileCard?.classList.add("is-leaving");

    window.setTimeout(() => {
        window.location.replace("../index.html");
    }, 420);
}

function handleDeveloperSubmit() {
    const existingProfile = loadProfile();
    const now = new Date().toISOString();

    const profile = {
        tag: DEVELOPER_TAG,
        role: DEVELOPER_ROLE,
        playerId: DEVELOPER_PLAYER_ID,
        avatar: existingProfile?.avatar || "",
        createdAt: existingProfile?.createdAt || now,
        updatedAt: now
    };

    if (!saveProfile(profile)) {
        setSavingState(false, "ENTER ARCADE");
        showMessage(
            "ACCOUNT SESSION NOT FOUND",
            "error"
        );
        return;
    }

    updateIdentity(
        DEVELOPER_TAG,
        DEVELOPER_ROLE,
        DEVELOPER_PLAYER_ID,
        profile.avatar
    );

    setProfileTopState(
        '<span class="verified-word">VERIFIED</span>' +
        '<span class="role-word">ROLE</span>'
    );

    setSuccessButtonState();

    showMessage(
        "DEVELOPER PROFILE READY",
        "success"
    );

    setSavingState(
        true,
        "ENTERING ARCADE"
    );

    redirectToArcade();
}

function handlePlayerSubmit() {
    const tag =
        (arcadeTagInput?.value || "").trim();

    const validationMessage =
        validateTag(tag);

    if (validationMessage) {
        showMessage(
            validationMessage,
            "error"
        );

        arcadeTagInput?.focus();
        return;
    }

    const existingProfile = loadProfile();

    const currentTag =
        existingProfile?.tag || "";

    if (
        tag.toLowerCase() !== currentTag.toLowerCase() &&
        isTagTaken(tag)
    ) {
        showMessage(
            "THAT ARCADE TAG IS ALREADY IN USE",
            "error"
        );

        arcadeTagInput?.focus();
        return;
    }

    const now = new Date().toISOString();

    const playerId =
        existingProfile?.playerId ||
        createPlayerId();

    const profile = {
        tag,
        role: PLAYER_ROLE,
        playerId,
        avatar: existingProfile?.avatar || "",
        avatarChangesUsed:
            Number.isFinite(existingProfile?.avatarChangesUsed)
                ? existingProfile.avatarChangesUsed
                : 0,
        avatarNextChangeAt:
            Number.isFinite(existingProfile?.avatarNextChangeAt)
                ? existingProfile.avatarNextChangeAt
                : 0,
        createdAt:
            existingProfile?.createdAt ||
            now,
        updatedAt: now
    };

    if (!saveProfile(profile)) {
        showMessage(
            "ACCOUNT SESSION NOT FOUND",
            "error"
        );
        return;
    }

    const isUpdate =
        Boolean(existingProfile?.tag);

    updateIdentity(
        tag,
        PLAYER_ROLE,
        playerId,
        profile.avatar
    );

    setProfileTopState("PLAYER PROFILE");
    setSuccessButtonState();

    showMessage(
        isUpdate
            ? "PROFILE UPDATED"
            : "PROFILE CREATED",
        "success"
    );

    setSavingState(
        true,
        isUpdate
            ? "SAVING PROFILE"
            : "ENTERING ARCADE"
    );

    window.setTimeout(() => {
        if (saveButtonLabel) {
            saveButtonLabel.textContent = "ENTERING ARCADE";
        }
    }, 220);

    redirectToArcade();
}

function handleSubmit(event) {
    event.preventDefault();

    if (
        isSaving ||
        isProcessingAvatar
    ) {
        return;
    }

    showMessage("");

    if (isDeveloperAccount()) {
        handleDeveloperSubmit();
        return;
    }

    handlePlayerSubmit();
}

function initializeProfile() {
    if (
        sessionStorage.getItem(ACCESS_KEY) !==
        "granted"
    ) {
        window.location.replace(
            "../auth/login.html"
        );
        return;
    }

    if (!getAccountEmail()) {
        window.location.replace(
            "../auth/login.html"
        );
        return;
    }

    const profile = loadProfile();

    if (isDeveloperAccount()) {
        applyDeveloperMode();
    } else {
        applyPlayerMode(profile);
    }

    if (profileCard) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                profileCard.classList.add("is-ready");
            });
        });
    }
}

if (profileAvatar) {
    profileAvatar.addEventListener(
        "click",
        () => openAvatarPicker(false)
    );
}

if (changeAvatarButton) {
    changeAvatarButton.addEventListener(
        "click",
        () => openAvatarPicker(true)
    );
}

if (removeAvatarButton) {
    removeAvatarButton.addEventListener(
        "click",
        removeAvatar
    );
}

if (avatarInput) {
    avatarInput.addEventListener(
        "change",
        handleAvatarSelection
    );
}

if (arcadeTagInput) {
    arcadeTagInput.addEventListener(
        "input",
        () => {
            if (
                isDeveloperAccount() ||
                isSaving
            ) {
                return;
            }

            const currentValue =
                arcadeTagInput.value;

            const profile = loadProfile();

            updateIdentity(
                currentValue,
                PLAYER_ROLE,
                profile?.playerId ||
                    "ZA-000000",
                profile?.avatar || ""
            );

            showMessage("");
        }
    );
}

if (profileBackLink) {
    profileBackLink.addEventListener(
        "click",
        event => {
            if (
                isLeavingPage ||
                event.defaultPrevented
            ) {
                return;
            }

            const target = profileBackLink.href;

            if (
                !target ||
                target === window.location.href
            ) {
                return;
            }

            event.preventDefault();

            isLeavingPage = true;
            document.body.classList.add("is-leaving");
            profileCard?.classList.add("is-leaving");

            window.setTimeout(() => {
                window.location.href = target;
            }, 320);
        }
    );
}

if (profileForm) {
    profileForm.addEventListener(
        "submit",
        handleSubmit
    );
}

initializeProfile();