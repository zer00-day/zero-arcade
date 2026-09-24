const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

const playerScoreElement = document.getElementById("playerScore");
const aiScoreElement = document.getElementById("aiScore");
const speedValue = document.getElementById("speedValue");
const targetValue = document.getElementById("targetValue");
const gameStatus = document.getElementById("gameStatus");
const newGameButton = document.getElementById("newGameButton");
const upButton = document.getElementById("upButton");
const downButton = document.getElementById("downButton");
const controlButtons = [upButton, downButton];
const pongControls = document.querySelector(".pong-controls");
const targetButtons = Array.from(document.querySelectorAll(".target-button"));

const BASE_BALL_SPEED = 5;
const MAX_BALL_SPEED = 9;
const COUNTDOWN_SECONDS = 3;
const COUNTDOWN_STEP_DELAY = 700;
const GO_DELAY = 500;
const POINT_DELAY = 650;
const FIXED_STEP = 1;
const MAX_FRAME_STEPS = 5;
const MAX_PHYSICS_STEPS = 8;
const BALL_SUBSTEP_DISTANCE = 5;
const MIN_BOUNCE_ANGLE = 0.08;
const MAX_BOUNCE_ANGLE = 1.05;

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
    speed: 4.2,
    reaction: 0.12
};

const keys = {
    up: false,
    down: false
};

let animationFrame = null;
let gameState = "ready";
let roundActive = false;
let lastTime = 0;
let accumulator = 0;
let pointTimer = null;
let countdownTimer = null;
let colors = {};
let inputMode = "keyboard";
let targetScore = 5;
let pageHidden = false;

const touchDeviceQuery = window.matchMedia("(pointer: coarse)");
const isTouchDevice = touchDeviceQuery.matches;

function setInputMode(mode) {
    if (mode !== "keyboard" && mode !== "touch") {
        return;
    }

    if (inputMode === mode) {
        updateMobileControls();
        return;
    }

    inputMode = mode;

    if (mode === "keyboard") {
        resetKeys();
    }

    updateMobileControls();
}

function detectInitialInputMode() {
    inputMode = isTouchDevice ? "touch" : "keyboard";
    updateMobileControls();
}

function resizeCanvas() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
    const width = Math.round(world.width * pixelRatio);
    const height = Math.round(world.height * pixelRatio);

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw();
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

function resetBall(direction = 1, centered = true) {
    ball.x = world.width / 2 - ball.size / 2;
    ball.y = world.height / 2 - ball.size / 2;
    ball.speed = BASE_BALL_SPEED;

    if (centered) {
        ball.vx = 0;
        ball.vy = 0;
        speedValue.textContent = "1.0x";
        return;
    }

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

function setTarget(value) {
    const parsedValue = Number(value);

    const selectedTarget = clamp(
        Number.isFinite(parsedValue) ? parsedValue : 5,
        1,
        5
    );

    targetScore = selectedTarget;

    if (targetValue) {
        targetValue.textContent = String(targetScore);
    }

    targetButtons.forEach((button) => {
        const isSelected =
            Number(button.dataset.target) === targetScore;

        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
    });
}

function setTargetControlsDisabled(disabled) {
    targetButtons.forEach((button) => {
        button.disabled = disabled;
    });
}

function showStartButton() {
    newGameButton.textContent = "START GAME";
    newGameButton.setAttribute("aria-label", "Start Pong game");
    newGameButton.classList.remove("is-hidden");
    newGameButton.disabled = false;
}

function hideStartButton() {
    newGameButton.classList.add("is-hidden");
    newGameButton.disabled = true;
}

function updateMobileControls() {
    const shouldShow =
        isTouchDevice &&
        inputMode === "touch" &&
        (gameState === "countdown" || gameState === "playing");

    pongControls.hidden = !shouldShow;

    if (!shouldShow) {
        resetKeys();
    }
}

function clearTimers() {
    clearTimeout(pointTimer);
    clearTimeout(countdownTimer);

    pointTimer = null;
    countdownTimer = null;
}

function stopGameLoop() {
    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }

    accumulator = 0;
}

function startCountdown() {
    clearTimers();
    stopGameLoop();
    resetKeys();
    resetPaddles();
    resetBall();

    gameState = "countdown";
    roundActive = false;
    pageHidden = false;

    hideStartButton();
    setTargetControlsDisabled(true);
    updateMobileControls();

    setGameStatus(String(COUNTDOWN_SECONDS));

    let count = COUNTDOWN_SECONDS;

    const countdownStep = () => {
        if (gameState !== "countdown") {
            return;
        }

        if (pageHidden) {
            countdownTimer = setTimeout(
                countdownStep,
                COUNTDOWN_STEP_DELAY
            );
            return;
        }

        count -= 1;

        if (count > 0) {
            setGameStatus(String(count));

            countdownTimer = setTimeout(
                countdownStep,
                COUNTDOWN_STEP_DELAY
            );

            return;
        }

        setGameStatus("GO", "win");

        countdownTimer = setTimeout(() => {
            if (gameState !== "countdown") {
                return;
            }

            if (pageHidden) {
                countdownTimer = setTimeout(
                    () => {
                        if (gameState === "countdown") {
                            resetBall(
                                Math.random() < 0.5 ? -1 : 1,
                                false
                            );

                            gameState = "playing";
                            roundActive = true;
                            setGameStatus("");
                            updateMobileControls();

                            lastTime = performance.now();
                            accumulator = 0;
                            animationFrame =
                                requestAnimationFrame(gameLoop);
                        }
                    },
                    GO_DELAY
                );

                return;
            }

            resetBall(
                Math.random() < 0.5 ? -1 : 1,
                false
            );

            gameState = "playing";
            roundActive = true;

            setGameStatus("");
            updateMobileControls();

            lastTime = performance.now();
            accumulator = 0;
            animationFrame = requestAnimationFrame(gameLoop);
        }, GO_DELAY);
    };

    countdownTimer = setTimeout(
        countdownStep,
        COUNTDOWN_STEP_DELAY
    );

    draw();
}

function startGame() {
    if (
        gameState === "playing" ||
        gameState === "countdown"
    ) {
        return;
    }

    pageHidden = false;

    player.score = 0;
    ai.score = 0;

    updateScoreboard();
    setGameStatus("");

    startCountdown();
}

function finishGame() {
    gameState = "finished";
    roundActive = false;

    clearTimers();
    stopGameLoop();
    resetKeys();
    resetPaddles();
    resetBall();

    setTargetControlsDisabled(false);
    updateMobileControls();
    showStartButton();

    const playerWon = player.score >= targetScore;

    setGameStatus(
        playerWon ? "YOU WIN" : "AI WINS",
        playerWon ? "win" : "lose"
    );

    draw();
}

function scorePoint(playerScored) {
    if (
        gameState !== "playing" ||
        !roundActive
    ) {
        return;
    }

    roundActive = false;
    resetKeys();

    if (playerScored) {
        player.score += 1;
    } else {
        ai.score += 1;
    }

    updateScoreboard();

    if (
        player.score >= targetScore ||
        ai.score >= targetScore
    ) {
        finishGame();
        return;
    }

    setGameStatus(
        playerScored ? "POINT" : "AI POINT",
        playerScored ? "win" : "lose"
    );

    pointTimer = setTimeout(() => {
        pointTimer = null;

        if (gameState !== "playing") {
            return;
        }

        if (pageHidden) {
            pointTimer = setTimeout(
                () => {
                    if (gameState !== "playing") {
                        return;
                    }

                    resetPaddles();
                    resetBall(
                        playerScored ? 1 : -1,
                        false
                    );

                    roundActive = true;
                    setGameStatus("");
                    lastTime = performance.now();
                    accumulator = 0;
                },
                POINT_DELAY
            );

            return;
        }

        resetPaddles();
        resetBall(
            playerScored ? 1 : -1,
            false
        );

        roundActive = true;
        setGameStatus("");
        lastTime = performance.now();
        accumulator = 0;
    }, POINT_DELAY);
}

function movePlayer(delta) {
    if (
        gameState !== "playing" ||
        !roundActive
    ) {
        return;
    }

    player.y = clamp(
        player.y + delta,
        0,
        world.height - paddle.height
    );
}

function updatePlayer(delta) {
    if (
        gameState !== "playing" ||
        !roundActive
    ) {
        return;
    }

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
    if (
        gameState !== "playing" ||
        !roundActive
    ) {
        return;
    }

    const ballCenter = ball.y + ball.size / 2;
    const aiCenter = ai.y + paddle.height / 2;

    const lead = ball.vx > 0
        ? ball.vy * ai.reaction
        : 0;

    const target = ballCenter + lead;
    const difference = target - aiCenter;
    const maxMovement = ai.speed * delta;

    if (Math.abs(difference) > 3) {
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
    const paddleCenter =
        paddleObject.y + paddle.height / 2;

    const ballCenter =
        ball.y + ball.size / 2;

    const relative = clamp(
        (ballCenter - paddleCenter) /
            (paddle.height / 2),
        -1,
        1
    );

    let angle = relative * MAX_BOUNCE_ANGLE;

    if (Math.abs(angle) < MIN_BOUNCE_ANGLE) {
        angle = angle < 0
            ? -MIN_BOUNCE_ANGLE
            : MIN_BOUNCE_ANGLE;
    }

    ball.speed = Math.min(
        ball.speed + 0.2,
        MAX_BALL_SPEED
    );

    ball.vx =
        Math.cos(angle) *
        ball.speed *
        direction;

    ball.vy =
        Math.sin(angle) *
        ball.speed;

    speedValue.textContent =
        `${(ball.speed / BASE_BALL_SPEED).toFixed(1)}x`;
}

function updateBall(delta) {
    if (
        gameState !== "playing" ||
        !roundActive
    ) {
        return;
    }

    const distance =
        Math.max(
            Math.abs(ball.vx),
            Math.abs(ball.vy)
        ) * delta;

    const steps = clamp(
        Math.ceil(distance / BALL_SUBSTEP_DISTANCE),
        1,
        MAX_PHYSICS_STEPS
    );

    const stepDelta = delta / steps;

    for (
        let step = 0;
        step < steps;
        step += 1
    ) {
        if (
            gameState !== "playing" ||
            !roundActive
        ) {
            return;
        }

        ball.x += ball.vx * stepDelta;
        ball.y += ball.vy * stepDelta;

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

            bounceFromPaddle(
                player,
                1
            );
        } else if (
            ball.vx > 0 &&
            rectanglesOverlap(ballRect, aiRect)
        ) {
            ball.x = ai.x - ball.size;

            bounceFromPaddle(
                ai,
                -1
            );
        }

        if (ball.x + ball.size < 0) {
            scorePoint(false);
            return;
        }

        if (ball.x > world.width) {
            scorePoint(true);
            return;
        }
    }
}

function update(delta) {
    if (gameState !== "playing") {
        return;
    }

    updatePlayer(delta);
    updateAI(delta);

    if (roundActive) {
        updateBall(delta);
    }
}

function drawRoundedRect(
    x,
    y,
    width,
    height,
    radius
) {
    const r = Math.min(
        radius,
        width / 2,
        height / 2
    );

    ctx.beginPath();

    ctx.moveTo(
        x + r,
        y
    );

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
    if (gameState !== "playing") {
        animationFrame = null;
        return;
    }

    const elapsed = Math.max(
        0,
        Math.min(
            timestamp - lastTime,
            250
        )
    );

    lastTime = timestamp;
    accumulator += elapsed;

    let steps = 0;

    while (
        accumulator >= 16.6667 &&
        steps < MAX_FRAME_STEPS
    ) {
        update(FIXED_STEP);
        accumulator -= 16.6667;
        steps += 1;

        if (gameState !== "playing") {
            accumulator = 0;
            break;
        }
    }

    if (steps === MAX_FRAME_STEPS) {
        accumulator = 0;
    }

    draw();

    if (gameState === "playing") {
        animationFrame = requestAnimationFrame(gameLoop);
    } else {
        animationFrame = null;
    }
}

function setKeyState(key, value) {
    const normalizedKey = key.toLowerCase();

    if (
        key === "ArrowUp" ||
        normalizedKey === "w"
    ) {
        keys.up = value;
    }

    if (
        key === "ArrowDown" ||
        normalizedKey === "s"
    ) {
        keys.down = value;
    }
}

function handleKeyDown(event) {
    if (gameState !== "playing") {
        return;
    }

    const key = event.key;
    const normalizedKey = key.toLowerCase();

    if (
        key === "ArrowUp" ||
        key === "ArrowDown" ||
        normalizedKey === "w" ||
        normalizedKey === "s"
    ) {
        event.preventDefault();

        if (inputMode !== "keyboard") {
            setInputMode("keyboard");
        }

        setKeyState(key, true);
    }
}

function handleKeyUp(event) {
    setKeyState(
        event.key,
        false
    );
}

function bindHoldButton(button, keyName) {
    const press = (event) => {
        event.preventDefault();

        if (
            !isTouchDevice ||
            gameState !== "playing"
        ) {
            return;
        }

        if (inputMode !== "touch") {
            setInputMode("touch");
        }

        keys[keyName] = true;
        button.classList.add("control-active");

        if (
            button.setPointerCapture &&
            !button.hasPointerCapture(event.pointerId)
        ) {
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

    button.addEventListener(
        "pointerdown",
        press
    );

    button.addEventListener(
        "pointerup",
        release
    );

    button.addEventListener(
        "pointercancel",
        release
    );

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
        pageHidden = true;
        resetKeys();
        return;
    }

    pageHidden = false;

    if (gameState === "playing") {
        lastTime = performance.now();
        accumulator = 0;
    }
}

newGameButton.addEventListener(
    "click",
    startGame
);

targetButtons.forEach((button) => {
    button.addEventListener(
        "click",
        () => {
            if (
                gameState === "ready" ||
                gameState === "finished"
            ) {
                setTarget(button.dataset.target);
            }
        }
    );
});

window.addEventListener(
    "keydown",
    handleKeyDown
);

window.addEventListener(
    "keyup",
    handleKeyUp
);

window.addEventListener(
    "blur",
    resetKeys
);

window.addEventListener(
    "resize",
    resizeCanvas
);

document.addEventListener(
    "visibilitychange",
    handleVisibilityChange
);

bindHoldButton(
    upButton,
    "up"
);

bindHoldButton(
    downButton,
    "down"
);

detectInitialInputMode();

const themeObserver =
    new MutationObserver(() => {
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
setTarget(5);
setTargetControlsDisabled(false);
resetPaddles();
resetBall();
updateScoreboard();
showStartButton();
updateMobileControls();
resizeCanvas();