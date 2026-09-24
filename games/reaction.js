const gameArea = document.getElementById("gameArea");
const gameMessage = document.getElementById("gameMessage");
const gameStatus = document.getElementById("gameStatus");
const reactionScore = document.getElementById("reactionScore");
const bestScore = document.getElementById("bestScore");

let gameState = "idle";
let startTime = 0;
let timer = null;
let gameSession = 0;

const STORAGE_KEY = "zero-arcade-best-reaction";

const savedBest = Number(localStorage.getItem(STORAGE_KEY));

if (Number.isFinite(savedBest) && savedBest > 0) {
    bestScore.textContent = `${savedBest} ms`;
}

function setGameStatus(message = "", type = "") {
    gameStatus.textContent = message;
    gameStatus.className = "game-status";

    if (message) {
        gameStatus.classList.add("visible");

        if (type) {
            gameStatus.classList.add(type);
        }
    }
}

function updateGameLabel(state) {
    const labels = {
        idle: "Start Reaction Test",
        waiting: "Wait for the blue signal",
        ready: "Click now",
        tooSoon: "Try Reaction Test again",
        result: "Try Reaction Test again"
    };

    gameArea.setAttribute(
        "aria-label",
        labels[state] || "Reaction Test"
    );
}

function setState(state) {
    const states = {
        idle: {
            className: "state-idle",
            message: "START"
        },
        waiting: {
            className: "state-waiting",
            message: "WAIT"
        },
        ready: {
            className: "state-ready",
            message: "CLICK"
        },
        tooSoon: {
            className: "state-too-soon",
            message: "TOO SOON"
        },
        result: {
            className: "state-result",
            message: "NICE"
        }
    };

    const current = states[state];

    if (!current) {
        return;
    }

    gameState = state;

    gameArea.className = `game-area ${current.className}`;
    gameMessage.textContent = current.message;

    updateGameLabel(state);
}

function startGame() {
    clearTimeout(timer);

    gameSession += 1;

    const currentSession = gameSession;

    startTime = 0;
    reactionScore.textContent = "— ms";

    setGameStatus("");
    setState("waiting");

    const delay =
        Math.floor(Math.random() * 2500) + 1500;

    timer = setTimeout(() => {
        if (
            currentSession !== gameSession ||
            gameState !== "waiting"
        ) {
            return;
        }

        startTime = performance.now();
        setState("ready");
    }, delay);
}

function finishGame() {
    if (
        gameState !== "ready" ||
        startTime <= 0
    ) {
        return;
    }

    const reactionTime = Math.round(
        performance.now() - startTime
    );

    const currentBest = Number(
        localStorage.getItem(STORAGE_KEY)
    );

    const isNewBest =
        !Number.isFinite(currentBest) ||
        currentBest <= 0 ||
        reactionTime < currentBest;

    reactionScore.textContent =
        `${reactionTime} ms`;

    setState("result");

    if (isNewBest) {
        localStorage.setItem(
            STORAGE_KEY,
            String(reactionTime)
        );

        bestScore.textContent =
            `${reactionTime} ms`;

        setGameStatus(
            `NEW BEST ${reactionTime} MS`
        );
    } else {
        setGameStatus(
            `REACTION ${reactionTime} MS`
        );
    }

    startTime = 0;
}

function handleGameClick() {
    if (
        gameState === "idle" ||
        gameState === "result" ||
        gameState === "tooSoon"
    ) {
        startGame();
        return;
    }

    if (gameState === "waiting") {
        clearTimeout(timer);

        gameSession += 1;
        startTime = 0;

        reactionScore.textContent = "— ms";

        setState("tooSoon");

        setGameStatus(
            "TOO SOON WAIT FOR BLUE",
            "danger"
        );

        return;
    }

    if (gameState === "ready") {
        finishGame();
    }
}

gameArea.addEventListener(
    "click",
    handleGameClick
);

setState("idle");