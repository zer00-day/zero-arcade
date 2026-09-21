const gameBoard = document.getElementById("gameBoard");
const mineCountElement = document.getElementById("mineCount");
const timeScoreElement = document.getElementById("timeScore");
const bestScoreElement = document.getElementById("bestScore");
const restartButton = document.getElementById("restartButton");

const STORAGE_KEY = "zero-arcade-minesweeper-best";
const BOARD_SIZE = 9;
const MINE_COUNT = 10;

let board = [];
let gameStarted = false;
let gameOver = false;
let elapsedTime = 0;
let timer = null;
let revealedCount = 0;
let flaggedCount = 0;
let longPressTimer = null;
let longPressTriggered = false;

const bestScore = Number(localStorage.getItem(STORAGE_KEY)) || 0;

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function updateScore() {
    mineCountElement.textContent = MINE_COUNT - flaggedCount;
    timeScoreElement.textContent = formatTime(elapsedTime);
    bestScoreElement.textContent = bestScore || "—";
}

function createEmptyBoard() {
    board = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
        const boardRow = [];

        for (let column = 0; column < BOARD_SIZE; column++) {
            boardRow.push({
                row,
                column,
                mine: false,
                revealed: false,
                flagged: false,
                adjacent: 0
            });
        }

        board.push(boardRow);
    }
}

function getNeighbors(row, column) {
    const neighbors = [];

    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
            if (rowOffset === 0 && columnOffset === 0) {
                continue;
            }

            const nextRow = row + rowOffset;
            const nextColumn = column + columnOffset;

            if (
                nextRow >= 0 &&
                nextRow < BOARD_SIZE &&
                nextColumn >= 0 &&
                nextColumn < BOARD_SIZE
            ) {
                neighbors.push(board[nextRow][nextColumn]);
            }
        }
    }

    return neighbors;
}

function placeMines(safeRow, safeColumn) {
    const safeCells = new Set();

    getNeighbors(safeRow, safeColumn).forEach(cell => {
        safeCells.add(`${cell.row}-${cell.column}`);
    });

    safeCells.add(`${safeRow}-${safeColumn}`);

    const availableCells = [];

    for (const row of board) {
        for (const cell of row) {
            if (!safeCells.has(`${cell.row}-${cell.column}`)) {
                availableCells.push(cell);
            }
        }
    }

    for (let index = availableCells.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [availableCells[index], availableCells[randomIndex]] = [
            availableCells[randomIndex],
            availableCells[index]
        ];
    }

    availableCells.slice(0, MINE_COUNT).forEach(cell => {
        cell.mine = true;
    });

    for (const row of board) {
        for (const cell of row) {
            cell.adjacent = getNeighbors(cell.row, cell.column)
                .filter(neighbor => neighbor.mine)
                .length;
        }
    }
}

function renderBoard() {
    gameBoard.innerHTML = "";

    for (const row of board) {
        for (const cell of row) {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "mine-cell";
            button.dataset.row = cell.row;
            button.dataset.column = cell.column;
            button.setAttribute(
                "aria-label",
                `Row ${cell.row + 1}, Column ${cell.column + 1}`
            );

            if (cell.flagged) {
                button.classList.add("flagged");
                button.textContent = "⚑";
            } else if (cell.revealed) {
                button.classList.add("revealed");

                if (cell.mine) {
                    button.classList.add("mine");
                    button.textContent = "✦";
                } else if (cell.adjacent > 0) {
                    button.classList.add(`number-${cell.adjacent}`);
                    button.textContent = cell.adjacent;
                }
            }

            gameBoard.appendChild(button);
        }
    }
}

function startTimer() {
    clearInterval(timer);

    timer = setInterval(() => {
        if (gameOver) {
            return;
        }

        elapsedTime++;
        updateScore();
    }, 1000);
}

function stopTimer() {
    clearInterval(timer);
    timer = null;
}

function revealCell(cell) {
    if (
        gameOver ||
        cell.revealed ||
        cell.flagged
    ) {
        return;
    }

    if (!gameStarted) {
        placeMines(cell.row, cell.column);
        gameStarted = true;
        startTimer();
    }

    cell.revealed = true;
    revealedCount++;

    if (cell.mine) {
        loseGame(cell);
        return;
    }

    if (cell.adjacent === 0) {
        getNeighbors(cell.row, cell.column).forEach(neighbor => {
            if (
                !neighbor.revealed &&
                !neighbor.flagged &&
                !neighbor.mine
            ) {
                revealCell(neighbor);
            }
        });
    }

    renderBoard();
    checkWin();
}

function revealAllMines(explodedCell = null) {
    for (const row of board) {
        for (const cell of row) {
            if (cell.mine) {
                cell.revealed = true;
            }
        }
    }

    renderBoard();

    if (explodedCell) {
        const cells = gameBoard.querySelectorAll(".mine-cell");

        cells.forEach(button => {
            const row = Number(button.dataset.row);
            const column = Number(button.dataset.column);

            if (
                row === explodedCell.row &&
                column === explodedCell.column
            ) {
                button.classList.add("exploded");
            }
        });
    }
}

function loseGame(explodedCell) {
    gameOver = true;
    gameStarted = false;
    stopTimer();
    revealAllMines(explodedCell);
}

function checkWin() {
    const safeCells = BOARD_SIZE * BOARD_SIZE - MINE_COUNT;

    if (revealedCount !== safeCells) {
        return;
    }

    gameOver = true;
    gameStarted = false;
    stopTimer();

    for (const row of board) {
        for (const cell of row) {
            if (cell.mine && !cell.flagged) {
                cell.flagged = true;
                flaggedCount++;
            }
        }
    }

    if (
        !bestScore ||
        elapsedTime < bestScore
    ) {
        localStorage.setItem(STORAGE_KEY, elapsedTime);
        bestScoreElement.textContent = elapsedTime;
    }

    updateScore();
    renderBoard();
}

function toggleFlag(cell) {
    if (
        gameOver ||
        cell.revealed
    ) {
        return;
    }

    if (!gameStarted) {
        return;
    }

    if (cell.flagged) {
        cell.flagged = false;
        flaggedCount--;
    } else if (flaggedCount < MINE_COUNT) {
        cell.flagged = true;
        flaggedCount++;
    }

    updateScore();
    renderBoard();
}

function getCellFromTarget(target) {
    const button = target.closest(".mine-cell");

    if (!button) {
        return null;
    }

    const row = Number(button.dataset.row);
    const column = Number(button.dataset.column);

    return board[row][column];
}

function handleBoardClick(event) {
    if (longPressTriggered) {
        longPressTriggered = false;
        return;
    }

    const cell = getCellFromTarget(event.target);

    if (!cell) {
        return;
    }

    revealCell(cell);
}

function handleContextMenu(event) {
    event.preventDefault();

    const cell = getCellFromTarget(event.target);

    if (!cell) {
        return;
    }

    toggleFlag(cell);
}

function handleTouchStart(event) {
    const cell = getCellFromTarget(event.target);

    if (!cell || gameOver) {
        return;
    }

    longPressTriggered = false;

    longPressTimer = setTimeout(() => {
        longPressTriggered = true;
        toggleFlag(cell);
    }, 500);
}

function handleTouchEnd() {
    clearTimeout(longPressTimer);
}

function startNewGame() {
    stopTimer();

    elapsedTime = 0;
    revealedCount = 0;
    flaggedCount = 0;
    gameStarted = false;
    gameOver = false;

    createEmptyBoard();
    updateScore();
    renderBoard();
}

restartButton.addEventListener("click", startNewGame);

gameBoard.addEventListener("click", handleBoardClick);
gameBoard.addEventListener("contextmenu", handleContextMenu);
gameBoard.addEventListener("touchstart", handleTouchStart, { passive: true });
gameBoard.addEventListener("touchend", handleTouchEnd);
gameBoard.addEventListener("touchcancel", handleTouchEnd);

startNewGame();