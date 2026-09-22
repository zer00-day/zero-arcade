const gameBoard = document.getElementById("gameBoard");
const movesScore = document.getElementById("movesScore");
const timeScore = document.getElementById("timeScore");
const bestScore = document.getElementById("bestScore");
const restartButton = document.getElementById("restartButton");
const gameHint = document.getElementById("gameHint");
const gameStatus = document.getElementById("gameStatus");

const STORAGE_KEY = "zero-arcade-memory-best";

const symbols = [
    "●", "▲", "■", "◆", "★", "✦", "○", "◇",
    "●", "▲", "■", "◆", "★", "✦", "○", "◇"
];

let cards = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let moves = 0;
let matchedPairs = 0;
let seconds = 0;
let timer = null;
let mismatchTimer = null;
let gameStarted = false;
let gameSession = 0;

const savedBest = Number(localStorage.getItem(STORAGE_KEY));

if (Number.isFinite(savedBest) && savedBest > 0) {
    bestScore.textContent = `${savedBest} moves`;
}

function shuffle(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[randomIndex]] = [
            shuffled[randomIndex],
            shuffled[i]
        ];
    }

    return shuffled;
}

function formatTime(value) {
    const minutes = Math.floor(value / 60);
    const remainingSeconds = value % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function updateScores() {
    movesScore.textContent = moves;
    timeScore.textContent = formatTime(seconds);
}

function setGameStatus(message = "", type = "") {
    gameStatus.textContent = message;
    gameStatus.className = "game-status";

    if (message) {
        gameStatus.classList.add("visible");
    }

    if (type) {
        gameStatus.classList.add(type);
    }
}

function startTimer() {
    if (timer) {
        return;
    }

    timer = setInterval(() => {
        seconds++;
        timeScore.textContent = formatTime(seconds);
    }, 1000);
}

function stopTimer() {
    clearInterval(timer);
    timer = null;
}

function clearMismatchTimer() {
    clearTimeout(mismatchTimer);
    mismatchTimer = null;
}

function getCardLabel(card) {
    const symbol = card.dataset.symbol;

    if (card.classList.contains("matched")) {
        return `Matched card ${symbol}`;
    }

    if (card.classList.contains("flipped")) {
        return `Revealed card ${symbol}`;
    }

    return "Hidden memory card";
}

function updateCardLabel(card) {
    card.setAttribute("aria-label", getCardLabel(card));
}

function createCard(symbol, index) {
    const card = document.createElement("button");

    card.className = "memory-card";
    card.type = "button";
    card.dataset.symbol = symbol;
    card.dataset.index = index;
    card.setAttribute("aria-label", "Hidden memory card");

    card.innerHTML = `
        <span class="memory-card-inner">
            <span class="memory-card-front">?</span>
            <span class="memory-card-back">${symbol}</span>
        </span>
    `;

    card.addEventListener("click", () => handleCardClick(card));

    return card;
}

function setupBoard() {
    gameBoard.innerHTML = "";
    cards = shuffle(symbols);

    cards.forEach((symbol, index) => {
        gameBoard.appendChild(createCard(symbol, index));
    });
}

function resetTurn() {
    firstCard = null;
    secondCard = null;
    lockBoard = false;
}

function flipCard(card) {
    card.classList.add("flipped");
    updateCardLabel(card);
}

function unflipCards(session) {
    mismatchTimer = setTimeout(() => {
        if (session !== gameSession || !firstCard || !secondCard) {
            return;
        }

        firstCard.classList.remove("flipped");
        secondCard.classList.remove("flipped");

        updateCardLabel(firstCard);
        updateCardLabel(secondCard);

        mismatchTimer = null;
        resetTurn();
    }, 700);
}

function handleMatch() {
    if (!firstCard || !secondCard) {
        return;
    }

    firstCard.classList.add("matched");
    secondCard.classList.add("matched");

    updateCardLabel(firstCard);
    updateCardLabel(secondCard);

    matchedPairs++;
    resetTurn();

    if (matchedPairs === symbols.length / 2) {
        finishGame();
    }
}

function handleMismatch() {
    unflipCards(gameSession);
}

function handleCardClick(card) {
    if (
        lockBoard ||
        card === firstCard ||
        card.classList.contains("matched") ||
        card.classList.contains("flipped")
    ) {
        return;
    }

    if (!gameStarted) {
        gameStarted = true;
        startTimer();
        setGameStatus();
    }

    flipCard(card);

    if (!firstCard) {
        firstCard = card;
        return;
    }

    secondCard = card;
    lockBoard = true;
    moves++;

    updateScores();

    if (firstCard.dataset.symbol === secondCard.dataset.symbol) {
        handleMatch();
    } else {
        handleMismatch();
    }
}

function finishGame() {
    stopTimer();
    clearMismatchTimer();

    const currentBest = Number(localStorage.getItem(STORAGE_KEY));

    const isNewBest =
        !Number.isFinite(currentBest) ||
        currentBest <= 0 ||
        moves < currentBest;

    if (isNewBest) {
        localStorage.setItem(STORAGE_KEY, String(moves));
        bestScore.textContent = `${moves} moves`;
        setGameStatus(`NEW BEST ${moves} MOVES · ${formatTime(seconds)}`, "new-best");
    } else {
        setGameStatus(`CLEARED ${moves} MOVES · ${formatTime(seconds)}`, "win");
    }

    gameStarted = false;
}

function startNewGame() {
    stopTimer();
    clearMismatchTimer();

    gameSession++;
    firstCard = null;
    secondCard = null;
    lockBoard = false;
    moves = 0;
    matchedPairs = 0;
    seconds = 0;
    gameStarted = false;

    setGameStatus();
    gameHint.textContent = "MATCH ALL PAIRS";

    updateScores();
    setupBoard();
}

restartButton.addEventListener("click", startNewGame);

startNewGame();