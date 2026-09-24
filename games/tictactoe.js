const board = document.getElementById("board");
const cells = Array.from(document.querySelectorAll(".cell"));
const playerScoreDisplay = document.getElementById("playerScore");
const drawScoreDisplay = document.getElementById("drawScore");
const aiScoreDisplay = document.getElementById("aiScore");
const playerScoreCard = document.getElementById("playerScoreCard");
const aiScoreCard = document.getElementById("aiScoreCard");
const difficultyButtons = Array.from(document.querySelectorAll("[data-difficulty]"));
const turnStatus = document.getElementById("turnStatus");
const gameResult = document.getElementById("gameResult");
const newGameButton = document.getElementById("newGameButton");

const PLAYER = "X";
const AI = "O";
const AI_RESPONSE_DELAY = 360;

const WINNING_COMBINATIONS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

let boardState = Array(9).fill("");
let difficulty = "medium";
let playerScore = 0;
let drawScore = 0;
let aiScore = 0;
let gameStarted = false;
let gameOver = false;
let playerTurn = true;
let aiTimer = null;

function setTurnStatus(message, type = "") {
    turnStatus.textContent = message;
    turnStatus.className = "turn-status";

    if (type) {
        turnStatus.classList.add(type);
    }
}

function setDifficultyButtonsDisabled(disabled) {
    difficultyButtons.forEach((button) => {
        button.disabled = disabled;
    });
}

function updateScores() {
    playerScoreDisplay.textContent = String(playerScore);
    drawScoreDisplay.textContent = String(drawScore);
    aiScoreDisplay.textContent = String(aiScore);
}

function updateScoreHighlight() {
    playerScoreCard.classList.toggle(
        "active",
        playerTurn && gameStarted && !gameOver
    );

    aiScoreCard.classList.toggle(
        "active",
        !playerTurn && gameStarted && !gameOver
    );
}

function updateCell(index) {
    const cell = cells[index];
    const value = boardState[index];

    cell.textContent = value;
    cell.className = "cell";

    if (value === PLAYER) {
        cell.classList.add("x");
        cell.setAttribute("aria-label", "X");
    } else if (value === AI) {
        cell.classList.add("o");
        cell.setAttribute("aria-label", "O");
    } else {
        cell.setAttribute("aria-label", "Empty cell");
    }

    cell.disabled =
        !gameStarted ||
        gameOver ||
        !playerTurn ||
        Boolean(value);
}

function updateBoard() {
    cells.forEach((_, index) => {
        updateCell(index);
    });

    board.setAttribute(
        "aria-disabled",
        String(!gameStarted || gameOver)
    );
}

function resetBoard() {
    clearTimeout(aiTimer);
    aiTimer = null;

    boardState = Array(9).fill("");
    gameOver = false;
    playerTurn = true;
    gameResult.textContent = "";

    updateBoard();
    updateScoreHighlight();
}

function startGame() {
    resetBoard();

    gameStarted = true;
    gameOver = false;
    playerTurn = true;

    newGameButton.textContent = "NEW GAME";

    setDifficultyButtonsDisabled(true);
    setTurnStatus("YOUR TURN");

    updateBoard();
    updateScoreHighlight();
}

function finishGame(result, winningCombination = []) {
    clearTimeout(aiTimer);
    aiTimer = null;

    gameOver = true;
    gameStarted = false;

    winningCombination.forEach((index) => {
        cells[index].classList.add("winner");
    });

    if (result === "player") {
        playerScore += 1;
        gameResult.textContent = "YOU WIN";
        setTurnStatus("YOU WIN", "success");
    } else if (result === "ai") {
        aiScore += 1;
        gameResult.textContent = "AI WINS";
        setTurnStatus("AI WINS", "danger");
    } else {
        drawScore += 1;
        gameResult.textContent = "DRAW";
        setTurnStatus("DRAW");
    }

    updateScores();
    updateBoard();
    updateScoreHighlight();

    setDifficultyButtonsDisabled(false);
    newGameButton.textContent = "NEW GAME";
}

function getWinner(state) {
    for (const combination of WINNING_COMBINATIONS) {
        const [a, b, c] = combination;

        if (
            state[a] &&
            state[a] === state[b] &&
            state[a] === state[c]
        ) {
            return {
                winner: state[a],
                combination
            };
        }
    }

    if (state.every(Boolean)) {
        return {
            winner: "draw",
            combination: []
        };
    }

    return null;
}

function checkGameEnd() {
    const result = getWinner(boardState);

    if (!result) {
        return false;
    }

    finishGame(
        result.winner === PLAYER
            ? "player"
            : result.winner === AI
                ? "ai"
                : "draw",
        result.combination
    );

    return true;
}

function makePlayerMove(index) {
    if (
        !gameStarted ||
        gameOver ||
        !playerTurn ||
        boardState[index]
    ) {
        return;
    }

    boardState[index] = PLAYER;
    updateCell(index);

    if (checkGameEnd()) {
        return;
    }

    playerTurn = false;

    updateBoard();
    updateScoreHighlight();
    setTurnStatus("AI THINKING", "thinking");

    aiTimer = setTimeout(() => {
        aiTimer = null;
        makeAiMove();
    }, AI_RESPONSE_DELAY);
}

function getEmptyCells(state) {
    return state
        .map((value, index) => value ? null : index)
        .filter((index) => index !== null);
}

function findWinningMove(mark) {
    const emptyCells = getEmptyCells(boardState);

    for (const index of emptyCells) {
        boardState[index] = mark;

        if (getWinner(boardState)?.winner === mark) {
            boardState[index] = "";
            return index;
        }

        boardState[index] = "";
    }

    return null;
}

function getRandomMove() {
    const emptyCells = getEmptyCells(boardState);

    if (!emptyCells.length) {
        return null;
    }

    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function getMediumMove() {
    const winningMove = findWinningMove(AI);

    if (winningMove !== null) {
        return winningMove;
    }

    const blockingMove = findWinningMove(PLAYER);

    if (blockingMove !== null) {
        return blockingMove;
    }

    if (!boardState[4]) {
        return 4;
    }

    const corners = [0, 2, 6, 8].filter(
        (index) => !boardState[index]
    );

    if (corners.length) {
        return corners[
            Math.floor(Math.random() * corners.length)
        ];
    }

    return getRandomMove();
}

function minimax(state, depth, maximizing) {
    const result = getWinner(state);

    if (result?.winner === AI) {
        return 10 - depth;
    }

    if (result?.winner === PLAYER) {
        return depth - 10;
    }

    if (result?.winner === "draw") {
        return 0;
    }

    const emptyCells = getEmptyCells(state);

    if (maximizing) {
        let bestScore = -Infinity;

        for (const index of emptyCells) {
            state[index] = AI;

            bestScore = Math.max(
                bestScore,
                minimax(state, depth + 1, false)
            );

            state[index] = "";
        }

        return bestScore;
    }

    let bestScore = Infinity;

    for (const index of emptyCells) {
        state[index] = PLAYER;

        bestScore = Math.min(
            bestScore,
            minimax(state, depth + 1, true)
        );

        state[index] = "";
    }

    return bestScore;
}

function getHardMove() {
    const emptyCells = getEmptyCells(boardState);

    if (!emptyCells.length) {
        return null;
    }

    let bestMove = emptyCells[0];
    let bestScore = -Infinity;

    for (const index of emptyCells) {
        boardState[index] = AI;

        const score = minimax(boardState, 0, false);

        boardState[index] = "";

        if (score > bestScore) {
            bestScore = score;
            bestMove = index;
        }
    }

    return bestMove;
}

function getAiMove() {
    if (difficulty === "easy") {
        return getRandomMove();
    }

    if (difficulty === "hard") {
        return getHardMove();
    }

    return getMediumMove();
}

function makeAiMove() {
    if (!gameStarted || gameOver || playerTurn) {
        return;
    }

    const move = getAiMove();

    if (move === null) {
        return;
    }

    boardState[move] = AI;
    updateCell(move);

    if (checkGameEnd()) {
        return;
    }

    playerTurn = true;

    updateBoard();
    updateScoreHighlight();
    setTurnStatus("YOUR TURN");
}

function handleDifficulty(event) {
    if (gameStarted && !gameOver) {
        return;
    }

    const selectedDifficulty =
        event.currentTarget.dataset.difficulty;

    if (!selectedDifficulty) {
        return;
    }

    difficulty = selectedDifficulty;

    difficultyButtons.forEach((button) => {
        button.classList.toggle(
            "active",
            button.dataset.difficulty === difficulty
        );
    });
}

function handleNewGame() {
    startGame();
}

cells.forEach((cell) => {
    cell.addEventListener("click", () => {
        const index = Number(cell.dataset.index);
        makePlayerMove(index);
    });
});

difficultyButtons.forEach((button) => {
    button.addEventListener("click", handleDifficulty);
});

newGameButton.addEventListener("click", handleNewGame);

updateScores();
setDifficultyButtonsDisabled(false);
resetBoard();

gameStarted = false;
gameOver = false;
playerTurn = true;

newGameButton.textContent = "START GAME";
setTurnStatus("READY");

updateBoard();
updateScoreHighlight();