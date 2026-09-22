const gameArea = document.getElementById("gameArea");
const gameMessage = document.getElementById("gameMessage");
const gameHint = document.getElementById("gameHint");
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

function setState(state) {
    const states = {
        idle: {
            background: "#fafaf8",
            borderColor: "#ddddda",
            color: "#101010",
            message: "START",
            hint: "CLICK TO START"
        },
        waiting: {
            background: "#101010",
            borderColor: "#101010",
            color: "#ffffff",
            message: "WAIT",
            hint: "WAIT FOR BLUE"
        },
        ready: {
            background: "#3b82f6",
            borderColor: "#3b82f6",
            color: "#ffffff",
            message: "CLICK",
            hint: "CLICK NOW"
        },
        tooSoon: {
            background: "#fff1f1",
            borderColor: "#ef4444",
            color: "#101010",
            message: "TOO SOON",
            hint: "CLICK TO TRY AGAIN"
        },
        result: {
            background: "#edf4ff",
            borderColor: "#3b82f6",
            color: "#101010",
            message: "NICE",
            hint: "CLICK TO PLAY AGAIN"
        }
    };

    const current = states[state];

    if (!current) {
        return;
    }

    gameState = state;
    gameArea.style.background = current.background;
    gameArea.style.borderColor = current.borderColor;
    gameArea.style.color = current.color;
    gameMessage.textContent = current.message;
    gameHint.textContent = current.hint;
}

function startGame() {
    clearTimeout(timer);
    gameSession += 1;

    const currentSession = gameSession;

    startTime = 0;
    reactionScore.textContent = "— ms";
    setGameStatus("");
    setState("waiting");

    const delay = Math.floor(Math.random() * 2500) + 1500;

    timer = setTimeout(() => {
        if (currentSession !== gameSession || gameState !== "waiting") {
            return;
        }

        startTime = performance.now();
        setState("ready");
    }, delay);
}

function finishGame() {
    if (gameState !== "ready" || startTime <= 0) {
        return;
    }

    const reactionTime = Math.round(performance.now() - startTime);
    const currentBest = Number(localStorage.getItem(STORAGE_KEY));

    const isNewBest =
        !Number.isFinite(currentBest) ||
        currentBest <= 0 ||
        reactionTime < currentBest;

    reactionScore.textContent = `${reactionTime} ms`;
    setState("result");

    if (isNewBest) {
        localStorage.setItem(STORAGE_KEY, String(reactionTime));
        bestScore.textContent = `${reactionTime} ms`;
        setGameStatus(`NEW BEST ${reactionTime} MS`);
    } else {
        setGameStatus(`REACTION ${reactionTime} MS`);
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
        setGameStatus("TOO SOON WAIT FOR BLUE", "danger");
        return;
    }

    if (gameState === "ready") {
        finishGame();
    }
}

gameArea.addEventListener("click", handleGameClick);

setState("idle");