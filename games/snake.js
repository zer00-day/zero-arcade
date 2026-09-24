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
const GAME_STEP = 140;
const INPUT_RESPONSE_DELAY = 55;
const STORAGE_KEY = "zero-arcade-best-snake";

let snake = [];
let previousSnake = [];
let food = null;
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let score = 0;
let bestScore = Number(localStorage.getItem(STORAGE_KEY)) || 0;
let gameTimer = null;
let renderLoop = null;
let gameStarted = false;
let gameOver = false;
let directionLocked = false;
let previousBestScore = bestScore;
let controlFeedbackTimer = null;
let inputMode = "keyboard";
let touchStartX = 0;
let touchStartY = 0;
let touchActive = false;
let lastStepTime = 0;
let nextStepTime = 0;
let renderedCells = new Set();
let cellWidth = 0;
let cellHeight = 0;

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

    controlButtons.forEach((button) => {
        button.classList.remove("control-active");
    });

    const activeButton = controlButtons.find(
        (button) => button.dataset.direction === directionName
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

    controlButtons.forEach((button) => {
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

    updateCellSize();
}

function updateCellSize() {
    const firstCell = board.children[0];

    if (!firstCell) {
        return;
    }

    const rect = firstCell.getBoundingClientRect();
    cellWidth = rect.width + 2;
    cellHeight = rect.height + 2;
}

function getCell(x, y) {
    if (
        x < 0 ||
        x >= gridSize ||
        y < 0 ||
        y >= gridSize
    ) {
        return null;
    }

    return board.children[y * gridSize + x];
}

function getCellKey(x, y) {
    return `${x},${y}`;
}

function randomFood() {
    const available = [];

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (
                !snake.some(
                    (segment) =>
                        segment.x === x &&
                        segment.y === y
                )
            ) {
                available.push({ x, y });
            }
        }
    }

    if (!available.length) {
        return null;
    }

    return available[
        Math.floor(Math.random() * available.length)
    ];
}

function resetRenderedCells() {
    renderedCells.forEach((key) => {
        const [x, y] = key.split(",").map(Number);
        const cell = getCell(x, y);

        if (!cell) {
            return;
        }

        cell.className = "snake-cell";
        cell.style.transform = "translate3d(0, 0, 0)";
    });

    renderedCells.clear();
}

function getInterpolationOffset(previous, current, progress) {
    if (!previous || !current) {
        return { x: 0, y: 0 };
    }

    return {
        x: (previous.x - current.x) * (1 - progress),
        y: (previous.y - current.y) * (1 - progress)
    };
}

function renderSnake(progress = 1) {
    resetRenderedCells();

    snake.forEach((segment, index) => {
        const previous = previousSnake[index] || segment;
        const cell = getCell(segment.x, segment.y);

        if (!cell) {
            return;
        }

        const offset = getInterpolationOffset(
            previous,
            segment,
            progress
        );

        cell.classList.add(
            index === 0
                ? "snake-head"
                : "snake-body"
        );

        cell.style.transform =
            `translate3d(${offset.x * cellWidth}px, ${offset.y * cellHeight}px, 0)`;

        renderedCells.add(
            getCellKey(segment.x, segment.y)
        );
    });

    if (food) {
        const foodCell = getCell(food.x, food.y);

        if (foodCell) {
            foodCell.classList.add("snake-food");
            renderedCells.add(
                getCellKey(food.x, food.y)
            );
        }
    }

    scoreDisplay.textContent = score;
    bestDisplay.textContent = bestScore;
}

function draw() {
    renderSnake(1);
}

function renderFrame(timestamp) {
    if (!renderLoop) {
        return;
    }

    const progress = gameStarted && lastStepTime
        ? Math.min(
            Math.max(
                (timestamp - lastStepTime) / GAME_STEP,
                0
            ),
            1
        )
        : 1;

    renderSnake(progress);
    renderLoop = requestAnimationFrame(renderFrame);
}

function startRenderLoop() {
    if (renderLoop) {
        return;
    }

    renderLoop = requestAnimationFrame(renderFrame);
}

function stopRenderLoop() {
    if (!renderLoop) {
        return;
    }

    cancelAnimationFrame(renderLoop);
    renderLoop = null;
}

function clearGameTimer() {
    clearTimeout(gameTimer);
    gameTimer = null;
}

function scheduleNextStep(delay = GAME_STEP) {
    clearGameTimer();

    if (!gameStarted || gameOver) {
        return;
    }

    nextStepTime = performance.now() + delay;

    gameTimer = setTimeout(() => {
        gameTimer = null;
        updateGame();
    }, delay);
}

function prepareGame() {
    clearGameTimer();
    clearControlFeedback();

    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];

    previousSnake = snake.map((segment) => ({
        ...segment
    }));

    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    gameStarted = false;
    gameOver = false;
    directionLocked = false;
    food = randomFood();
    lastStepTime = 0;
    nextStepTime = 0;

    board.classList.remove("game-over");
    setGameStatus("");

    restartButton.textContent = "START GAME";

    resetRenderedCells();
    updateCellSize();
    draw();
    startRenderLoop();
}

function startGame() {
    clearGameTimer();
    clearControlFeedback();

    previousBestScore = bestScore;

    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];

    previousSnake = snake.map((segment) => ({
        ...segment
    }));

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

    lastStepTime = performance.now();
    nextStepTime = lastStepTime + GAME_STEP;

    resetRenderedCells();
    updateCellSize();
    draw();
    startRenderLoop();
    scheduleNextStep(GAME_STEP);
}

function updateGame() {
    if (!gameStarted || gameOver) {
        return;
    }

    previousSnake = snake.map((segment) => ({
        ...segment
    }));

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

    const hitsSelf = bodyToCheck.some((segment) => {
        return (
            segment.x === newHead.x &&
            segment.y === newHead.y
        );
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
                STORAGE_KEY,
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
    lastStepTime = performance.now();

    scheduleNextStep(GAME_STEP);
}

function endGame(completed = false) {
    clearGameTimer();

    gameStarted = false;
    gameOver = true;
    directionLocked = false;

    clearControlFeedback();

    board.classList.add("game-over");
    restartButton.textContent = "NEW GAME";

    renderSnake(1);

    if (completed) {
        const isNewBest = score > previousBestScore;

        if (isNewBest) {
            setGameStatus(`NEW BEST SCORE ${score}`);
        } else {
            setGameStatus(`BOARD CLEARED SCORE ${score}`);
        }

        return;
    }

    const isNewBest = score > previousBestScore;

    if (isNewBest) {
        setGameStatus(`NEW BEST SCORE ${score}`);
    } else {
        setGameStatus(
            `GAME OVER SCORE ${score}`,
            "danger"
        );
    }
}

function nudgeNextStep() {
    if (!gameStarted || gameOver || !gameTimer) {
        return;
    }

    const remaining = nextStepTime - performance.now();

    if (remaining <= INPUT_RESPONSE_DELAY) {
        return;
    }

    scheduleNextStep(INPUT_RESPONSE_DELAY);
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

    nudgeNextStep();
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
    const directionName =
        event.currentTarget.dataset.direction;

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

    if (
        !event.touches.length ||
        !gameStarted ||
        gameOver
    ) {
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

    const deltaX =
        touch.clientX - touchStartX;

    const deltaY =
        touch.clientY - touchStartY;

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

function handleVisibilityChange() {
    if (!document.hidden && gameStarted) {
        const now = performance.now();

        lastStepTime = now;

        if (nextStepTime < now) {
            scheduleNextStep(GAME_STEP);
        }
    }
}

function handleResize() {
    updateCellSize();

    if (!gameStarted) {
        draw();
    }
}

document.addEventListener(
    "keydown",
    handleKeyboard
);

document.addEventListener(
    "visibilitychange",
    handleVisibilityChange
);

window.addEventListener(
    "resize",
    handleResize
);

controlButtons.forEach((button) => {
    button.addEventListener(
        "click",
        handleControlClick
    );
});

board.addEventListener(
    "touchstart",
    handleTouchStart,
    {
        passive: true
    }
);

board.addEventListener(
    "touchend",
    handleTouchEnd,
    {
        passive: true
    }
);

board.addEventListener(
    "touchcancel",
    handleTouchCancel,
    {
        passive: true
    }
);

restartButton.addEventListener(
    "click",
    () => {
        startGame();
    }
);

const coarsePointer = window.matchMedia(
    "(pointer: coarse)"
);

setInputMode(
    coarsePointer.matches
        ? "touch"
        : "keyboard"
);

createBoard();
prepareGame();