const cells = Array.from(document.querySelectorAll(".cell"));

const turnStatus = document.getElementById("turnStatus");

const gameResult = document.getElementById("gameResult");

const newGameButton = document.getElementById("newGameButton");

const playerScore = document.getElementById("playerScore");

const drawScore = document.getElementById("drawScore");

const aiScore = document.getElementById("aiScore");

const playerScoreCard = document.getElementById("playerScoreCard");

const aiScoreCard = document.getElementById("aiScoreCard");

const PLAYER = "X";

const AI = "O";

const EMPTY = "";

const SCORE_KEY = "zero-arcade-tictactoe-score";

const winningLines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

const preferredMoves = [4, 0, 2, 6, 8, 1, 3, 5, 7];

let board = Array(9).fill(EMPTY);
let gameActive = true;
let playerTurn = true;
let aiTimer = null;
let gameVersion = 0;

let score = {
    player: 0,
    draw: 0,
    ai: 0
};

function loadScore() {
    try {
        const savedScore = JSON.parse(localStorage.getItem(SCORE_KEY));

        if (
            savedScore &&
            Number.isFinite(savedScore.player) &&
            Number.isFinite(savedScore.draw) &&
            Number.isFinite(savedScore.ai)
        ) {
            score = {
                player: Math.max(0, Math.floor(savedScore.player)),
                draw: Math.max(0, Math.floor(savedScore.draw)),
                ai: Math.max(0, Math.floor(savedScore.ai))
            };
        }
    } catch {
        score = {
            player: 0,
            draw: 0,
            ai: 0
        };
    }

    updateScore();
}

function saveScore() {
    localStorage.setItem(SCORE_KEY, JSON.stringify(score));
}

function updateScore() {
    playerScore.textContent = score.player;
    drawScore.textContent = score.draw;
    aiScore.textContent = score.ai;
}

function updateTurnUI(state) {
    turnStatus.classList.remove("thinking", "success", "danger");

    playerScoreCard.classList.remove("active");
    aiScoreCard.classList.remove("active");

    if (state === "player") {
        turnStatus.textContent = "YOUR TURN";
        playerScoreCard.classList.add("active");
        return;
    }

    if (state === "ai") {
        turnStatus.textContent = "AI THINKING";
        turnStatus.classList.add("thinking");
        aiScoreCard.classList.add("active");
        return;
    }

    if (state === "player-win") {
        turnStatus.textContent = "YOU WIN";
        turnStatus.classList.add("success");
        playerScoreCard.classList.add("active");
        return;
    }

    if (state === "ai-win") {
        turnStatus.textContent = "AI WINS";
        turnStatus.classList.add("danger");
        aiScoreCard.classList.add("active");
        return;
    }

    if (state === "draw") {
        turnStatus.textContent = "DRAW";
    }
}

function updateCells() {
    cells.forEach((cell, index) => {
        const value = board[index];

        cell.textContent = value;
        cell.disabled = !gameActive || !playerTurn || value !== EMPTY;

        cell.classList.remove("x", "o", "winner");

        if (value === PLAYER) {
            cell.classList.add("x");
        }

        if (value === AI) {
            cell.classList.add("o");
        }

        cell.setAttribute(
            "aria-label",
            value === EMPTY ? "Empty cell" : `Cell ${index + 1}, ${value}`
        );
    });
}

function getWinner(currentBoard) {
    for (const line of winningLines) {
        const [a, b, c] = line;

        if (
            currentBoard[a] !== EMPTY &&
            currentBoard[a] === currentBoard[b] &&
            currentBoard[a] === currentBoard[c]
        ) {
            return {
                winner: currentBoard[a],
                line
            };
        }
    }

    if (currentBoard.every(cell => cell !== EMPTY)) {
        return {
            winner: "draw",
            line: []
        };
    }

    return null;
}

function getAvailableMoves(currentBoard) {
    const moves = [];

    for (let index = 0; index < currentBoard.length; index++) {
        if (currentBoard[index] === EMPTY) {
            moves.push(index);
        }
    }

    return moves;
}

function evaluateBoard(currentBoard, depth) {
    const result = getWinner(currentBoard);

    if (!result) {
        return null;
    }

    if (result.winner === AI) {
        return 10 - depth;
    }

    if (result.winner === PLAYER) {
        return depth - 10;
    }

    return 0;
}

function minimax(currentBoard, depth, maximizing, alpha, beta) {
    const terminalScore = evaluateBoard(currentBoard, depth);

    if (terminalScore !== null) {
        return terminalScore;
    }

    const moves = getAvailableMoves(currentBoard);

    if (maximizing) {
        let bestScore = -Infinity;

        for (const move of moves) {
            currentBoard[move] = AI;

            const score = minimax(
                currentBoard,
                depth + 1,
                false,
                alpha,
                beta
            );

            currentBoard[move] = EMPTY;

            bestScore = Math.max(bestScore, score);
            alpha = Math.max(alpha, bestScore);

            if (beta <= alpha) {
                break;
            }
        }

        return bestScore;
    }

    let bestScore = Infinity;

    for (const move of moves) {
        currentBoard[move] = PLAYER;

        const score = minimax(
            currentBoard,
            depth + 1,
            true,
            alpha,
            beta
        );

        currentBoard[move] = EMPTY;

        bestScore = Math.min(bestScore, score);
        beta = Math.min(beta, bestScore);

        if (beta <= alpha) {
            break;
        }
    }

    return bestScore;
}

function findBestMove() {
    const moves = getAvailableMoves(board);

    if (!moves.length) {
        return -1;
    }

    let bestScore = -Infinity;
    let bestMoves = [];

    for (const move of moves) {
        board[move] = AI;

        const moveScore = minimax(
            board,
            0,
            false,
            -Infinity,
            Infinity
        );

        board[move] = EMPTY;

        if (moveScore > bestScore) {
            bestScore = moveScore;
            bestMoves = [move];
        } else if (moveScore === bestScore) {
            bestMoves.push(move);
        }
    }

    for (const preferredMove of preferredMoves) {
        if (bestMoves.includes(preferredMove)) {
            return preferredMove;
        }
    }

    return bestMoves[0];
}

function highlightWinningLine(line) {
    line.forEach(index => {
        cells[index].classList.add("winner");
    });
}

function finishGame(result) {
    if (!gameActive) {
        return;
    }

    gameActive = false;
    playerTurn = false;

    if (result.winner === PLAYER) {
        score.player += 1;
        gameResult.textContent = "NICE MOVE. YOU BEAT THE AI.";
        updateTurnUI("player-win");
    } else if (result.winner === AI) {
        score.ai += 1;
        gameResult.textContent = "THE AI FOUND THE WINNING LINE.";
        updateTurnUI("ai-win");
    } else {
        score.draw += 1;
        gameResult.textContent = "NO WINNER. PERFECT DEFENSE.";
        updateTurnUI("draw");
    }

    saveScore();
    updateScore();
    updateCells();

    if (result.line.length) {
        highlightWinningLine(result.line);
    }
}

function checkGameState() {
    const result = getWinner(board);

    if (result) {
        finishGame(result);
        return true;
    }

    return false;
}

function makePlayerMove(index) {
    if (
        !gameActive ||
        !playerTurn ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= board.length ||
        board[index] !== EMPTY
    ) {
        return;
    }

    board[index] = PLAYER;
    playerTurn = false;

    updateCells();

    if (checkGameState()) {
        return;
    }

    updateTurnUI("ai");

    clearTimeout(aiTimer);

    const currentVersion = gameVersion;

    aiTimer = setTimeout(() => {
        if (currentVersion !== gameVersion) {
            return;
        }

        makeAIMove(currentVersion);
    }, 320);
}

function makeAIMove(currentVersion) {
    if (
        currentVersion !== gameVersion ||
        !gameActive ||
        playerTurn
    ) {
        return;
    }

    const move = findBestMove();

    if (move === -1 || board[move] !== EMPTY) {
        return;
    }

    board[move] = AI;
    playerTurn = true;

    updateCells();

    if (checkGameState()) {
        return;
    }

    updateTurnUI("player");
}

function resetBoard() {
    clearTimeout(aiTimer);
    aiTimer = null;

    gameVersion += 1;

    board = Array(9).fill(EMPTY);
    gameActive = true;
    playerTurn = true;

    gameResult.textContent = "";

    updateTurnUI("player");
    updateCells();
}

function handleCellClick(event) {
    const index = Number(event.currentTarget.dataset.index);

    if (!Number.isInteger(index)) {
        return;
    }

    makePlayerMove(index);
}

cells.forEach(cell => {
    cell.addEventListener("click", handleCellClick);
});

newGameButton.addEventListener("click", resetBoard);

loadScore();
resetBoard();