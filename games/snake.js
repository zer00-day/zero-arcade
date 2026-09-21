const gameBoard = document.getElementById("gameBoard");
const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("bestScore");
const restartButton = document.getElementById("restartButton");
const controlButtons = document.querySelectorAll(".control-button");

const STORAGE_KEY = "zero-arcade-snake-best";
const BOARD_SIZE = 20;
const GAME_SPEED = 110;

let snake = [];
let food = null;
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let score = 0;
let bestScore = Number(localStorage.getItem(STORAGE_KEY)) || 0;
let gameLoop = null;
let gameOver = false;
let gameStarted = false;

bestScoreElement.textContent = bestScore;

function createBoard() {
    gameBoard.innerHTML = "";

    for (let index = 0; index < BOARD_SIZE * BOARD_SIZE; index++) {
        const cell = document.createElement("span");
        cell.className = "snake-cell";
        cell.dataset.index = index;
        gameBoard.appendChild(cell);
    }
}

function getCell(x, y) {
    return gameBoard.children[y * BOARD_SIZE + x];
}

function randomPosition() {
    return {
        x: Math.floor(Math.random() * BOARD_SIZE),
        y: Math.floor(Math.random() * BOARD_SIZE)
    };
}

function isSnakePosition(position) {
    return snake.some(segment => segment.x === position.x && segment.y === position.y);
}

function spawnFood() {
    let position = randomPosition();

    while (isSnakePosition(position)) {
        position = randomPosition();
    }

    food = position;
}

function render() {
    const cells = gameBoard.children;

    for (const cell of cells) {
        cell.className = "snake-cell";
    }

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
}

function updateScore() {
    scoreElement.textContent = score;
    bestScoreElement.textContent = bestScore;
}

function startGame() {
    clearInterval(gameLoop);

    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];

    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    gameOver = false;
    gameStarted = true;

    spawnFood();
    updateScore();
    render();

    gameLoop = setInterval(updateGame, GAME_SPEED);
}

function endGame() {
    clearInterval(gameLoop);
    gameLoop = null;
    gameOver = true;
    gameStarted = false;

    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem(STORAGE_KEY, bestScore);
        updateScore();
    }
}

function changeDirection(x, y) {
    if (!gameStarted || gameOver) {
        return;
    }

    const requestedDirection = { x, y };

    if (
        direction.x === requestedDirection.x &&
        direction.y === requestedDirection.y
    ) {
        return;
    }

    if (
        direction.x + requestedDirection.x === 0 &&
        direction.y + requestedDirection.y === 0
    ) {
        return;
    }

    nextDirection = requestedDirection;
}

function updateGame() {
    direction = nextDirection;

    const head = snake[0];

    const newHead = {
        x: head.x + direction.x,
        y: head.y + direction.y
    };

    if (
        newHead.x < 0 ||
        newHead.x >= BOARD_SIZE ||
        newHead.y < 0 ||
        newHead.y >= BOARD_SIZE
    ) {
        endGame();
        return;
    }

    const ateFood =
        newHead.x === food.x &&
        newHead.y === food.y;

    const bodyToCheck = ateFood ? snake : snake.slice(0, -1);

    if (
        bodyToCheck.some(
            segment => segment.x === newHead.x && segment.y === newHead.y
        )
    ) {
        endGame();
        return;
    }

    snake.unshift(newHead);

    if (ateFood) {
        score++;
        spawnFood();
    } else {
        snake.pop();
    }

    updateScore();
    render();
}

function highlightControl(directionName) {
    const button = document.querySelector(
        `.control-button[data-direction="${directionName}"]`
    );

    if (!button) {
        return;
    }

    button.classList.remove("control-active");
    void button.offsetWidth;
    button.classList.add("control-active");

    setTimeout(() => {
        button.classList.remove("control-active");
    }, 140);
}

function handleKeyDown(event) {
    const keyDirections = {
        ArrowUp: { x: 0, y: -1, control: "up" },
        w: { x: 0, y: -1, control: "up" },
        W: { x: 0, y: -1, control: "up" },
        ArrowDown: { x: 0, y: 1, control: "down" },
        s: { x: 0, y: 1, control: "down" },
        S: { x: 0, y: 1, control: "down" },
        ArrowLeft: { x: -1, y: 0, control: "left" },
        a: { x: -1, y: 0, control: "left" },
        A: { x: -1, y: 0, control: "left" },
        ArrowRight: { x: 1, y: 0, control: "right" },
        d: { x: 1, y: 0, control: "right" },
        D: { x: 1, y: 0, control: "right" }
    };

    const requestedDirection = keyDirections[event.key];

    if (!requestedDirection) {
        return;
    }

    event.preventDefault();
    changeDirection(requestedDirection.x, requestedDirection.y);
    highlightControl(requestedDirection.control);
}

function handleControlClick(event) {
    const directionMap = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 }
    };

    const directionName = event.currentTarget.dataset.direction;
    const requestedDirection = directionMap[directionName];

    if (!requestedDirection) {
        return;
    }

    changeDirection(requestedDirection.x, requestedDirection.y);
    highlightControl(directionName);
}

restartButton.addEventListener("click", startGame);

document.addEventListener("keydown", handleKeyDown);

controlButtons.forEach(button => {
    button.addEventListener("click", handleControlClick);
});

createBoard();
updateScore();
startGame();