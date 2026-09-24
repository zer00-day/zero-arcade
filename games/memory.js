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
let gameStartTime = 0;

const savedBest = Number(localStorage.getItem(STORAGE_KEY));

if (Number.isFinite(savedBest) && savedBest > 0) {
    bestScore.textContent = savedBest;
}

function shuffle(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(
            Math.random() * (i + 1)
        );

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

    return `${String(minutes).padStart(2, "0")}:${String(
        remainingSeconds
    ).padStart(2, "0")}`;
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

function updateElapsedTime() {
    if (!gameStartTime || !gameStarted) {
        return;
    }

    seconds = Math.floor(
        (performance.now() - gameStartTime) / 1000
    );

    timeScore.textContent = formatTime(seconds);
}

function startTimer() {
    if (timer || !gameStarted) {
        return;
    }

    gameStartTime = performance.now();

    updateElapsedTime();

    timer = setInterval(() => {
        updateElapsedTime();
    }, 250);
}

function stopTimer() {
    updateElapsedTime();

    clearInterval(timer);
    timer = null;
    gameStartTime = 0;
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
    card.setAttribute(
        "aria-label",
        getCardLabel(card)
    );
}

function createCard(symbol, index) {
    const card = document.createElement("button");

    card.className = "memory-card";
    card.type = "button";
    card.dataset.symbol = symbol;
    card.dataset.index = index;
    card.disabled = !gameStarted;
    card.setAttribute(
        "aria-label",
        "Hidden memory card"
    );

    card.innerHTML = `
        <span class="memory-card-inner">
            <span class="memory-card-front">?</span>
            <span class="memory-card-back">${symbol}</span>
        </span>
    `;

    card.addEventListener(
        "click",
        () => handleCardClick(card)
    );

    return card;
}

function setupBoard() {
    gameBoard.innerHTML = "";
    gameBoard.classList.remove("completed");

    cards = shuffle(symbols);

    cards.forEach((symbol, index) => {
        gameBoard.appendChild(
            createCard(symbol, index)
        );
    });
}

function setCardsEnabled(enabled) {
    cards.forEach((card) => {
        card.disabled = !enabled;
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
        if (
            session !== gameSession ||
            !firstCard ||
            !secondCard
        ) {
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

    if (
        matchedPairs ===
        symbols.length / 2
    ) {
        finishGame();
    }
}

function handleMismatch() {
    unflipCards(gameSession);
}

function handleCardClick(card) {
    if (
        !gameStarted ||
        lockBoard ||
        card === firstCard ||
        card.classList.contains("matched") ||
        card.classList.contains("flipped")
    ) {
        return;
    }

    if (!firstCard) {
        flipCard(card);
        firstCard = card;

        startTimer();

        return;
    }

    flipCard(card);

    secondCard = card;
    lockBoard = true;

    moves++;
    updateScores();

    if (
        firstCard.dataset.symbol ===
        secondCard.dataset.symbol
    ) {
        handleMatch();
    } else {
        handleMismatch();
    }
}

function finishGame() {
    updateElapsedTime();
    stopTimer();
    clearMismatchTimer();

    const currentBest = Number(
        localStorage.getItem(STORAGE_KEY)
    );

    const isNewBest =
        !Number.isFinite(currentBest) ||
        currentBest <= 0 ||
        moves < currentBest;

    gameStarted = false;
    setCardsEnabled(false);
    gameBoard.classList.add("completed");
    gameHint.textContent = "ALL PAIRS MATCHED";

    if (isNewBest) {
        localStorage.setItem(
            STORAGE_KEY,
            String(moves)
        );

        bestScore.textContent = moves;

        setGameStatus(
            `NEW BEST ${moves}`,
            "new-best"
        );
    } else {
        setGameStatus(
            `CLEARED ${moves} MOVES · ${formatTime(seconds)}`,
            "win"
        );
    }
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
    gameStartTime = 0;
    gameStarted = true;

    setGameStatus();

    gameHint.textContent = "MATCH ALL PAIRS";

    updateScores();
    setupBoard();

    restartButton.textContent = "NEW GAME";

    setCardsEnabled(true);
}

function initializeGame() {
    stopTimer();
    clearMismatchTimer();

    gameSession++;

    firstCard = null;
    secondCard = null;
    lockBoard = false;
    moves = 0;
    matchedPairs = 0;
    seconds = 0;
    gameStartTime = 0;
    gameStarted = false;

    setGameStatus();

    gameHint.textContent = "MATCH ALL PAIRS";

    updateScores();
    setupBoard();

    restartButton.textContent = "START GAME";

    setCardsEnabled(false);
}

restartButton.addEventListener(
    "click",
    () => {
        startNewGame();
    }
);

initializeGame();