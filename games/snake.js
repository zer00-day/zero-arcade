const board = document.getElementById("gameBoard");

const scoreDisplay = document.getElementById("score");

const bestDisplay = document.getElementById("bestScore");

const gameStatus = document.getElementById("gameStatus");

const restartButton = document.getElementById("restartButton");

const controlButtons = Array.from(document.querySelectorAll("[data-direction]"));

const controls = document.querySelector(".snake-controls");

const gridSize = 20;

const CONTROL_FEEDBACK_TIME = 140;

const SWIPE_THRESHOLD = 24;

let snake = [];

let food = null;

let direction = { x: 1, y: 0 };

let nextDirection = { x: 1, y: 0 };

let score = 0;

let bestScore = Number(localStorage.getItem("zero-arcade-best-snake")) || 0;

let gameLoop = null;

let gameStarted = false;

let gameOver = false;

let directionLocked = false;

let previousBestScore = bestScore;

let controlFeedbackTimer = null;

let inputMode = "keyboard";

let touchStartX = 0;

let touchStartY = 0;

let touchActive = false;

const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
};

const keyboardDirections = {
    arrowup: "up",
    w: "up",
    arrowdown: "down",
    s: "down",
    arrowleft: "left",
    a: "left",
    arrowright: "right",
    d: "right"
};

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

function setInputMode(mode) {
    inputMode = mode;

    if (mode === "keyboard") {
        controls.hidden = true;
        controls.setAttribute("aria-hidden", "true");
        clearControlFeedback();
        return;
    }

    controls.hidden = false;
    controls.setAttribute("aria-hidden", "false");
}

function showControlFeedback(directionName) {
    if (inputMode !== "touch") {
        return;
    }

    controlButtons.forEach(button => {
        button.classList.remove("control-active");
    });

    const activeButton = controlButtons.find(
        button => button.dataset.direction === directionName
    );

    if (!activeButton) {
        return;
    }

    activeButton.classList.add("control-active");

    clearTimeout(controlFeedbackTimer);

    controlFeedbackTimer = setTimeout(() => {
        activeButton.classList.remove("control-active");
    }, CONTROL_FEEDBACK_TIME);
}

function clearControlFeedback() {
    clearTimeout(controlFeedbackTimer);

    controlButtons.forEach(button => {
        button.classList.remove("control-active");
    });
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

    if (!available.length) {
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

function prepareGame() {
    clearInterval(gameLoop);

    clearControlFeedback();

    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];

    direction = { x: 1, y: 0 };

    nextDirection = { x: 1, y: 0 };

    score = 0;

    gameStarted = false;

    gameOver = false;

    directionLocked = false;

    food = randomFood();

    board.classList.remove("game-over");

    setGameStatus("");

    restartButton.textContent = "START GAME";

    draw();
}

function startGame() {
    clearInterval(gameLoop);

    clearControlFeedback();

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

    board.classList.remove("game-over");

    setGameStatus("");

    restartButton.textContent = "NEW GAME";

    draw();

    gameLoop = setInterval(updateGame, 140);
}

function updateGame() {
    if (!gameStarted || gameOver) {
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

    const willEat =
        food &&
        newHead.x === food.x &&
        newHead.y === food.y;

    const bodyToCheck = willEat
        ? snake
        : snake.slice(0, -1);

    const hitsSelf = bodyToCheck.some(segment => {
        return segment.x === newHead.x && segment.y === newHead.y;
    });

    if (hitsSelf) {
        endGame();

        return;
    }

    snake.unshift(newHead);

    if (willEat) {
        score += 1;

        if (score > bestScore) {
            bestScore = score;

            localStorage.setItem(
                "zero-arcade-best-snake",
                String(bestScore)
            );
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

    gameStarted = false;

    gameOver = true;

    directionLocked = false;

    clearControlFeedback();

    board.classList.add("game-over");

    restartButton.textContent = "NEW GAME";

    if (completed) {
        setGameStatus(`NEW BEST SCORE ${score}`);

        return;
    }

    const isNewBest = score > previousBestScore;

    if (isNewBest) {
        setGameStatus(`NEW BEST SCORE ${score}`);
    } else {
        setGameStatus(`GAME OVER SCORE ${score}`, "danger");
    }
}

function changeDirection(directionName, showFeedback = false) {
    if (!gameStarted || gameOver) {
        return;
    }

    const newDirection = directions[directionName];

    if (!newDirection) {
        return;
    }

    if (
        newDirection.x === -direction.x &&
        newDirection.y === -direction.y
    ) {
        return;
    }

    if (directionLocked) {
        return;
    }

    if (showFeedback) {
        showControlFeedback(directionName);
    }

    nextDirection = newDirection;

    directionLocked = true;
}

function handleKeyboard(event) {
    const key = event.key.toLowerCase();

    const directionName = keyboardDirections[key];

    if (!directionName) {
        return;
    }

    event.preventDefault();

    if (!gameStarted || gameOver) {
        return;
    }

    setInputMode("keyboard");

    changeDirection(directionName);
}

function handleControlClick(event) {
    const directionName = event.currentTarget.dataset.direction;

    if (!directions[directionName]) {
        return;
    }

    if (!gameStarted || gameOver) {
        return;
    }

    setInputMode("touch");

    changeDirection(directionName, true);
}

function handleTouchStart(event) {
    setInputMode("touch");

    if (!event.touches.length || !gameStarted || gameOver) {
        touchActive = false;

        return;
    }

    const touch = event.touches[0];

    touchStartX = touch.clientX;

    touchStartY = touch.clientY;

    touchActive = true;
}

function handleTouchEnd(event) {
    if (
        !touchActive ||
        !event.changedTouches.length ||
        !gameStarted ||
        gameOver
    ) {
        touchActive = false;

        return;
    }

    touchActive = false;

    const touch = event.changedTouches[0];

    const deltaX = touch.clientX - touchStartX;

    const deltaY = touch.clientY - touchStartY;

    if (
        Math.abs(deltaX) < SWIPE_THRESHOLD &&
        Math.abs(deltaY) < SWIPE_THRESHOLD
    ) {
        return;
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        changeDirection(
            deltaX > 0 ? "right" : "left",
            true
        );
    } else {
        changeDirection(
            deltaY > 0 ? "down" : "up",
            true
        );
    }
}

function handleTouchCancel() {
    touchActive = false;
}

document.addEventListener("keydown", handleKeyboard);

controlButtons.forEach(button => {
    button.addEventListener("click", handleControlClick);
});

board.addEventListener("touchstart", handleTouchStart, {
    passive: true
});

board.addEventListener("touchend", handleTouchEnd, {
    passive: true
});

board.addEventListener("touchcancel", handleTouchCancel, {
    passive: true
});

restartButton.addEventListener("click", () => {
    startGame();
});

const coarsePointer = window.matchMedia("(pointer: coarse)");

setInputMode(coarsePointer.matches ? "touch" : "keyboard");

createBoard();

prepareGame();