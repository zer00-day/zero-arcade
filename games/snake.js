const board = document.getElementById("gameBoard");
const scoreDisplay = document.getElementById("score");
const bestDisplay = document.getElementById("bestScore");
const gameHint = document.getElementById("gameHint");
const gameStatus = document.getElementById("gameStatus");
const restartButton = document.getElementById("restartButton");

const gridSize = 20;

let snake = [];
let food = {};
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let score = 0;
let bestScore = Number(localStorage.getItem("zero-arcade-best-snake")) || 0;
let gameLoop = null;
let gameStarted = false;
let gameOver = false;
let directionLocked = false;
let previousBestScore = bestScore;

bestDisplay.textContent = bestScore;

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

function updateHint(text) {
    gameHint.textContent = text;
}

function createBoard() {
    board.innerHTML = "";

    for (let i = 0; i < gridSize * gridSize; i++) {
        const cell = document.createElement("div");
        cell.className = "snake-cell";
        board.appendChild(cell);
    }
}

function getCell(x, y) {
    return board.children[y * gridSize + x];
}

function randomFood() {
    const available = [];

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (!snake.some(segment => segment.x === x && segment.y === y)) {
                available.push({ x, y });
            }
        }
    }

    if (available.length === 0) {
        return null;
    }

    return available[Math.floor(Math.random() * available.length)];
}

function draw() {
    document.querySelectorAll(".snake-cell").forEach(cell => {
        cell.className = "snake-cell";
    });

    snake.forEach((segment, index) => {
        const cell = getCell(segment.x, segment.y);

        if (!cell) {
            return;
        }

        cell.classList.add(index === 0 ? "snake-head" : "snake-body");
    });

    if (food) {
        const foodCell = getCell(food.x, food.y);

        if (foodCell) {
            foodCell.classList.add("snake-food");
        }
    }

    scoreDisplay.textContent = score;
    bestDisplay.textContent = bestScore;
}

function startGame() {
    clearInterval(gameLoop);

    previousBestScore = bestScore;

    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];

    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    gameStarted = true;
    gameOver = false;
    directionLocked = false;
    food = randomFood();

    setGameStatus("");
    updateHint("USE ARROWS OR WASD");
    draw();

    gameLoop = setInterval(updateGame, 120);
}

function updateGame() {
    if (gameOver) {
        return;
    }

    direction = nextDirection;

    const head = snake[0];

    const newHead = {
        x: head.x + direction.x,
        y: head.y + direction.y
    };

    if (
        newHead.x < 0 ||
        newHead.x >= gridSize ||
        newHead.y < 0 ||
        newHead.y >= gridSize
    ) {
        endGame();
        return;
    }

    const hitsSelf = snake.some(segment => {
        return segment.x === newHead.x && segment.y === newHead.y;
    });

    if (hitsSelf) {
        endGame();
        return;
    }

    snake.unshift(newHead);

    if (newHead.x === food.x && newHead.y === food.y) {
        score += 1;

        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem("zero-arcade-best-snake", String(bestScore));
        }

        food = randomFood();

        if (!food) {
            endGame(true);
            return;
        }
    } else {
        snake.pop();
    }

    directionLocked = false;
    draw();
}

function endGame(completed = false) {
    clearInterval(gameLoop);
    gameOver = true;
    gameStarted = false;

    if (completed) {
        setGameStatus(`NEW BEST SCORE ${score}`);
        updateHint("BOARD CLEARED");
        return;
    }

    const isNewBest = score > previousBestScore;

    if (isNewBest) {
        setGameStatus(`NEW BEST SCORE ${score}`);
    } else {
        setGameStatus(`GAME OVER SCORE ${score}`, "danger");
    }

    updateHint("PRESS NEW GAME TO TRY AGAIN");
}

function changeDirection(newDirection) {
    if (!gameStarted || gameOver || directionLocked) {
        return;
    }

    if (
        newDirection.x === -direction.x &&
        newDirection.y === -direction.y
    ) {
        return;
    }

    nextDirection = newDirection;
    directionLocked = true;
}

document.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    const directions = {
        arrowup: { x: 0, y: -1 },
        w: { x: 0, y: -1 },
        arrowdown: { x: 0, y: 1 },
        s: { x: 0, y: 1 },
        arrowleft: { x: -1, y: 0 },
        a: { x: -1, y: 0 },
        arrowright: { x: 1, y: 0 },
        d: { x: 1, y: 0 }
    };

    if (directions[key]) {
        event.preventDefault();
        changeDirection(directions[key]);
    }
});

document.querySelectorAll("[data-direction]").forEach(button => {
    button.addEventListener("click", () => {
        const directionName = button.dataset.direction;

        const directions = {
            up: { x: 0, y: -1 },
            down: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 }
        };

        if (directions[directionName]) {
            changeDirection(directions[directionName]);
        }
    });
});

restartButton.addEventListener("click", startGame);

createBoard();
startGame();