const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");
const playerScoreElement = document.getElementById("playerScore");
const aiScoreElement = document.getElementById("aiScore");
const speedValue = document.getElementById("speedValue");
const gameStatus = document.getElementById("gameStatus");
const newGameButton = document.getElementById("newGameButton");
const upButton = document.getElementById("upButton");
const downButton = document.getElementById("downButton");
const controlButtons = [upButton, downButton];
const pongControls = document.querySelector(".pong-controls");

const TARGET_SCORE = 5;
const BASE_BALL_SPEED = 5;
const MAX_BALL_SPEED = 9;

const world = {
    width: 800,
    height: 500
};

const paddle = {
    width: 14,
    height: 100,
    speed: 7
};

const ball = {
    size: 14,
    speed: BASE_BALL_SPEED,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0
};

const player = {
    x: 28,
    y: 0,
    score: 0
};

const ai = {
    x: world.width - 42,
    y: 0,
    score: 0,
    speed: 4.2
};

const keys = {
    up: false,
    down: false
};

let animationFrame = null;
let running = false;
let roundActive = false;
let lastTime = 0;
let pointTimer = null;
let colors = {};
let inputMode = "touch";

function setInputMode(mode) {
    inputMode = mode;
    pongControls.hidden = mode !== "touch";

    if (mode === "keyboard") {
        resetKeys();
    }
}

function detectInitialInputMode() {
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    setInputMode(coarsePointer ? "touch" : "keyboard");
}

function handlePointerInput(event) {
    if (event.pointerType === "touch" || event.pointerType === "pen") {
        setInputMode("touch");
    }
}

function refreshColors() {
    const styles = getComputedStyle(document.documentElement);

    colors = {
        background: styles.getPropertyValue("--panel").trim(),
        text: styles.getPropertyValue("--text").trim(),
        soft: styles.getPropertyValue("--soft").trim(),
        blue: styles.getPropertyValue("--blue").trim(),
        border: styles.getPropertyValue("--border").trim()
    };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function resetKeys() {
    keys.up = false;
    keys.down = false;

    controlButtons.forEach((button) => {
        button.classList.remove("control-active");
    });
}

function resetPaddles() {
    player.y = world.height / 2 - paddle.height / 2;
    ai.y = world.height / 2 - paddle.height / 2;
}

function resetBall(direction = Math.random() < 0.5 ? -1 : 1) {
    ball.x = world.width / 2 - ball.size / 2;
    ball.y = world.height / 2 - ball.size / 2;
    ball.speed = BASE_BALL_SPEED;

    const angle = Math.random() * 0.9 - 0.45;

    ball.vx = Math.cos(angle) * ball.speed * direction;
    ball.vy = Math.sin(angle) * ball.speed;

    speedValue.textContent = "1.0x";
}

function updateScoreboard() {
    playerScoreElement.textContent = String(player.score);
    aiScoreElement.textContent = String(ai.score);
}

function setGameStatus(message = "", type = "") {
    gameStatus.textContent = message;
    gameStatus.className = "game-status";

    if (message && type) {
        gameStatus.classList.add(type);
    }
}

function startGame() {
    clearTimeout(pointTimer);
    pointTimer = null;

    cancelAnimationFrame(animationFrame);
    animationFrame = null;

    resetKeys();

    player.score = 0;
    ai.score = 0;

    updateScoreboard();
    resetPaddles();
    resetBall();
    setGameStatus();

    running = true;
    roundActive = true;

    newGameButton.textContent = "NEW GAME";
    newGameButton.setAttribute("aria-label", "Start a new Pong game");

    lastTime = performance.now();
    animationFrame = requestAnimationFrame(gameLoop);
}

function finishGame() {
    running = false;
    roundActive = false;

    clearTimeout(pointTimer);
    pointTimer = null;

    resetKeys();

    cancelAnimationFrame(animationFrame);
    animationFrame = null;

    const playerWon = player.score >= TARGET_SCORE;

    setGameStatus(
        playerWon ? "YOU WIN" : "AI WINS",
        playerWon ? "win" : "lose"
    );

    newGameButton.textContent = "NEW GAME";
    newGameButton.setAttribute("aria-label", "Start a new Pong game");

    draw();
}

function scorePoint(playerScored) {
    if (!roundActive) {
        return;
    }

    roundActive = false;

    if (playerScored) {
        player.score += 1;
    } else {
        ai.score += 1;
    }

    updateScoreboard();

    if (player.score >= TARGET_SCORE || ai.score >= TARGET_SCORE) {
        finishGame();
        return;
    }

    setGameStatus(
        playerScored ? "POINT" : "AI POINT",
        playerScored ? "win" : "lose"
    );

    pointTimer = setTimeout(() => {
        if (!running) {
            return;
        }

        resetPaddles();
        resetBall(playerScored ? 1 : -1);
        roundActive = true;
        setGameStatus();
    }, 650);
}

function movePlayer(delta) {
    player.y = clamp(
        player.y + delta,
        0,
        world.height - paddle.height
    );
}

function updatePlayer(delta) {
    let movement = 0;

    if (keys.up) {
        movement -= paddle.speed * delta;
    }

    if (keys.down) {
        movement += paddle.speed * delta;
    }

    if (movement !== 0) {
        movePlayer(movement);
    }
}

function updateAI(delta) {
    const target = ball.y + ball.size / 2;
    const center = ai.y + paddle.height / 2;
    const difference = target - center;
    const maxMovement = ai.speed * delta;

    if (Math.abs(difference) > 5) {
        ai.y += clamp(
            difference,
            -maxMovement,
            maxMovement
        );
    }

    ai.y = clamp(
        ai.y,
        0,
        world.height - paddle.height
    );
}

function rectanglesOverlap(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function bounceFromPaddle(paddleObject, direction) {
    const paddleCenter = paddleObject.y + paddle.height / 2;
    const ballCenter = ball.y + ball.size / 2;

    const relative = clamp(
        (ballCenter - paddleCenter) / (paddle.height / 2),
        -1,
        1
    );

    const angle = relative * 1.05;

    ball.speed = Math.min(
        ball.speed + 0.25,
        MAX_BALL_SPEED
    );

    ball.vx = Math.cos(angle) * ball.speed * direction;
    ball.vy = Math.sin(angle) * ball.speed;

    speedValue.textContent = `${(
        ball.speed / BASE_BALL_SPEED
    ).toFixed(1)}x`;
}

function updateBall(delta) {
    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;

    if (ball.y <= 0) {
        ball.y = 0;
        ball.vy = Math.abs(ball.vy);
    }

    if (ball.y + ball.size >= world.height) {
        ball.y = world.height - ball.size;
        ball.vy = -Math.abs(ball.vy);
    }

    const playerRect = {
        x: player.x,
        y: player.y,
        width: paddle.width,
        height: paddle.height
    };

    const aiRect = {
        x: ai.x,
        y: ai.y,
        width: paddle.width,
        height: paddle.height
    };

    const ballRect = {
        x: ball.x,
        y: ball.y,
        width: ball.size,
        height: ball.size
    };

    if (
        ball.vx < 0 &&
        rectanglesOverlap(ballRect, playerRect)
    ) {
        ball.x = player.x + paddle.width;
        bounceFromPaddle(player, 1);
    }

    if (
        ball.vx > 0 &&
        rectanglesOverlap(ballRect, aiRect)
    ) {
        ball.x = ai.x - ball.size;
        bounceFromPaddle(ai, -1);
    }

    if (ball.x + ball.size < 0) {
        scorePoint(false);
    }

    if (ball.x > world.width) {
        scorePoint(true);
    }
}

function update(delta) {
    updatePlayer(delta);
    updateAI(delta);

    if (roundActive) {
        updateBall(delta);
    }
}

function drawRoundedRect(x, y, width, height, radius) {
    const r = Math.min(
        radius,
        width / 2,
        height / 2
    );

    ctx.beginPath();
    ctx.moveTo(x + r, y);

    ctx.arcTo(
        x + width,
        y,
        x + width,
        y + height,
        r
    );

    ctx.arcTo(
        x + width,
        y + height,
        x,
        y + height,
        r
    );

    ctx.arcTo(
        x,
        y + height,
        x,
        y,
        r
    );

    ctx.arcTo(
        x,
        y,
        x + width,
        y,
        r
    );

    ctx.closePath();
}

function draw() {
    ctx.clearRect(
        0,
        0,
        world.width,
        world.height
    );

    ctx.fillStyle = colors.background;

    ctx.fillRect(
        0,
        0,
        world.width,
        world.height
    );

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);

    ctx.beginPath();

    ctx.moveTo(
        world.width / 2,
        0
    );

    ctx.lineTo(
        world.width / 2,
        world.height
    );

    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = colors.soft;

    ctx.beginPath();

    ctx.arc(
        world.width / 2,
        world.height / 2,
        4,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = colors.text;

    drawRoundedRect(
        player.x,
        player.y,
        paddle.width,
        paddle.height,
        7
    );

    ctx.fill();

    drawRoundedRect(
        ai.x,
        ai.y,
        paddle.width,
        paddle.height,
        7
    );

    ctx.fill();

    ctx.fillStyle = colors.blue;

    drawRoundedRect(
        ball.x,
        ball.y,
        ball.size,
        ball.size,
        4
    );

    ctx.fill();
}

function gameLoop(timestamp) {
    const delta = Math.min(
        (timestamp - lastTime) / 16.6667,
        2
    );

    lastTime = timestamp;

    if (running) {
        update(delta);
    }

    draw();

    if (running) {
        animationFrame = requestAnimationFrame(gameLoop);
    } else {
        animationFrame = null;
    }
}

function setKeyState(key, value) {
    const normalizedKey = key.toLowerCase();

    if (key === "ArrowUp" || normalizedKey === "w") {
        keys.up = value;
    }

    if (key === "ArrowDown" || normalizedKey === "s") {
        keys.down = value;
    }
}

function handleKeyDown(event) {
    const key = event.key;
    const normalizedKey = key.toLowerCase();

    if (
        key === "ArrowUp" ||
        key === "ArrowDown" ||
        normalizedKey === "w" ||
        normalizedKey === "s"
    ) {
        event.preventDefault();
        setInputMode("keyboard");
        setKeyState(key, true);
    }
}

function handleKeyUp(event) {
    setKeyState(event.key, false);
}

function bindHoldButton(button, keyName) {
    const press = (event) => {
        event.preventDefault();

        setInputMode("touch");
        keys[keyName] = true;
        button.classList.add("control-active");

        if (button.setPointerCapture) {
            button.setPointerCapture(event.pointerId);
        }
    };

    const release = (event) => {
        event.preventDefault();

        keys[keyName] = false;
        button.classList.remove("control-active");

        if (
            button.hasPointerCapture &&
            button.hasPointerCapture(event.pointerId)
        ) {
            button.releasePointerCapture(event.pointerId);
        }
    };

    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);

    button.addEventListener(
        "lostpointercapture",
        () => {
            keys[keyName] = false;
            button.classList.remove("control-active");
        }
    );

    button.addEventListener(
        "contextmenu",
        (event) => {
            event.preventDefault();
        }
    );
}

function handleVisibilityChange() {
    if (document.hidden) {
        resetKeys();
    }
}

newGameButton.addEventListener("click", startGame);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", resetKeys);

document.addEventListener(
    "visibilitychange",
    handleVisibilityChange
);

window.addEventListener(
    "pointerdown",
    handlePointerInput
);

bindHoldButton(upButton, "up");
bindHoldButton(downButton, "down");

detectInitialInputMode();

const themeObserver = new MutationObserver(() => {
    refreshColors();
    draw();
});

themeObserver.observe(
    document.documentElement,
    {
        attributes: true,
        attributeFilter: ["data-theme"]
    }
);

refreshColors();
resetPaddles();
resetBall();
updateScoreboard();
setGameStatus();
draw();