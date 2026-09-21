const gameArea = document.getElementById("gameArea");
const gameMessage = document.getElementById("gameMessage");
const reactionScore = document.getElementById("reactionScore");
const bestScore = document.getElementById("bestScore");

let gameState = "idle";
let startTime = 0;
let timer = null;

const STORAGE_KEY = "zero-arcade-best";
const savedBest = localStorage.getItem(STORAGE_KEY);

if (savedBest) {
    bestScore.textContent = `${savedBest} ms`;
}

function setState(state) {
    gameState = state;

    const states = {
        idle: {
            background: "#fafaf8",
            borderColor: "#ddddda",
            color: "#101010",
            message: "START"
        },
        waiting: {
            background: "#101010",
            borderColor: "#101010",
            color: "#ffffff",
            message: "WAIT"
        },
        ready: {
            background: "#3b82f6",
            borderColor: "#3b82f6",
            color: "#ffffff",
            message: "CLICK"
        },
        tooSoon: {
            background: "#fff1f1",
            borderColor: "#ef4444",
            color: "#101010",
            message: "TOO SOON"
        },
        result: {
            background: "#edf4ff",
            borderColor: "#3b82f6",
            color: "#101010",
            message: "NICE"
        }
    };

    const current = states[state];

    gameArea.style.background = current.background;
    gameArea.style.borderColor = current.borderColor;
    gameArea.style.color = current.color;
    gameMessage.textContent = current.message;
}

function startGame() {
    clearTimeout(timer);

    reactionScore.textContent = "— ms";
    setState("waiting");

    const delay = Math.floor(Math.random() * 2500) + 1500;

    timer = setTimeout(() => {
        startTime = performance.now();
        setState("ready");
    }, delay);
}

function finishGame() {
    const reactionTime = Math.round(performance.now() - startTime);
    const currentBest = Number(localStorage.getItem(STORAGE_KEY)) || Infinity;

    reactionScore.textContent = `${reactionTime} ms`;
    setState("result");

    if (reactionTime < currentBest) {
        localStorage.setItem(STORAGE_KEY, reactionTime);
        bestScore.textContent = `${reactionTime} ms`;
    }
}

function handleGameClick() {
    if (gameState === "idle" || gameState === "result" || gameState === "tooSoon") {
        startGame();
        return;
    }

    if (gameState === "waiting") {
        clearTimeout(timer);
        reactionScore.textContent = "— ms";
        setState("tooSoon");
        return;
    }

    if (gameState === "ready") {
        finishGame();
    }
}

gameArea.addEventListener("click", handleGameClick);

setState("idle");