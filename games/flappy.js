const gameArea = document.getElementById("gameArea");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameButton = document.getElementById("gameButton");
const touchControlWrap = document.getElementById("touchControlWrap");
const touchControl = document.getElementById("touchControl");
const gameStatus = document.getElementById("gameStatus");
const scoreValue = document.getElementById("scoreValue");
const bestValue = document.getElementById("bestValue");
const scoreItem = document.getElementById("scoreItem");
const gameOverlay = document.getElementById("gameOverlay");
const BEST_KEY = "zero-arcade-flappy-best";

const FIXED_STEP = 1000 / 60;
const MAX_FRAME_TIME = 100;
const MAX_STEPS = 5;

let width = 0;
let height = 0;
let dpr = 1;
let animationFrame = 0;
let lastTime = 0;
let accumulator = 0;
let state = "idle";
let score = 0;
let best = Number(localStorage.getItem(BEST_KEY)) || 0;
let pipeTimer = 0;
let inputMode = "keyboard";
let idleTime = 0;
let touchFeedbackTimer = 0;
let scoreAnimationTimer = 0;
let previousPipeCenter = null;
let previousPipeDirection = 0;
let sameDirectionCount = 0;

const bird = {
    x: 0,
    y: 0,
    radius: 13,
    velocity: 0,
    rotation: 0,
    flapTime: 0
};

const pipes = [];

const settings = {
    gravity: 0.00125,
    flap: -0.40,
    pipeSpeed: 0.145,
    pipeWidth: 48,
    pipeGap: 158,
    pipeInterval: 1600,
    firstPipeDelay: 1180,
    groundHeight: 18,
    minPipeTop: 52,
    minPipeBottom: 52,
    mobileMinPipeGap: 112,
    mobileGapRatio: 0.48,
    mobileMarginRatio: 0.12,
    mobileMinMargin: 24,
    maxDifficulty: 12,
    minPipeCenterShift: 34,
    maxPipeCenterShift: 82,
    maxSameDirection: 2,
    firstPipeCenterRange: 34,
    preferredFirstPipePosition: 0.45
};

bestValue.textContent = String(best);

function getCss(variable) {
    return getComputedStyle(document.documentElement)
        .getPropertyValue(variable)
        .trim();
}

function setInputMode(mode) {
    if (inputMode === mode) {
        return;
    }

    inputMode = mode;
    touchControlWrap.classList.toggle("is-visible", mode === "touch");
}

function detectInitialInputMode() {
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const touchCapable =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;

    setInputMode(coarsePointer || touchCapable ? "touch" : "keyboard");
}

function resizeCanvas() {
    const rect = gameArea.getBoundingClientRect();

    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    bird.x = width * 0.25;

    if (state !== "playing") {
        bird.y = height * 0.45;
        draw();
    }
}

function updateButtonVisibility() {
    gameButton.classList.toggle("is-hidden", state === "playing");
}

function updateGameOverOverlay() {
    gameOverlay.classList.toggle("is-game-over", state === "over");
}

function resetScoreAnimation() {
    if (scoreAnimationTimer) {
        window.clearTimeout(scoreAnimationTimer);
        scoreAnimationTimer = 0;
    }

    scoreItem.classList.remove("score-pop");
}

function animateScore() {
    resetScoreAnimation();

    void scoreItem.offsetWidth;

    scoreItem.classList.add("score-pop");

    scoreAnimationTimer = window.setTimeout(() => {
        scoreItem.classList.remove("score-pop");
        scoreAnimationTimer = 0;
    }, 260);
}

function updateScoreDisplay() {
    scoreValue.textContent = String(score);
    animateScore();
}

function updateGameStatus(message, isBest = false) {
    gameStatus.className = "game-status";
    gameStatus.textContent = message;

    if (isBest) {
        gameStatus.classList.add("best");
    }

    if (message) {
        void gameStatus.offsetWidth;
        gameStatus.classList.add("status-pop");
    }
}

function resetGame() {
    cancelAnimationFrame(animationFrame);

    state = "idle";
    score = 0;
    pipeTimer = 0;
    accumulator = 0;
    idleTime = 0;
    previousPipeCenter = null;
    previousPipeDirection = 0;
    sameDirectionCount = 0;
    pipes.length = 0;

    bird.x = width * 0.25;
    bird.y = height * 0.45;
    bird.velocity = 0;
    bird.rotation = 0;
    bird.flapTime = 0;

    scoreValue.textContent = "0";
    updateGameStatus();
    resetScoreAnimation();

    gameButton.textContent = "START GAME";
    gameButton.setAttribute("aria-label", "Start Flappy Zero game");

    updateButtonVisibility();
    updateGameOverOverlay();
    draw();
}

function startGame() {
    if (state === "playing") {
        return;
    }

    cancelAnimationFrame(animationFrame);

    state = "playing";
    score = 0;
    pipeTimer = 0;
    accumulator = 0;
    previousPipeCenter = null;
    previousPipeDirection = 0;
    sameDirectionCount = 0;
    pipes.length = 0;

    bird.x = width * 0.25;
    bird.y = height * 0.45;
    bird.velocity = 0;
    bird.rotation = 0;
    bird.flapTime = 0;

    scoreValue.textContent = "0";
    updateGameStatus();
    resetScoreAnimation();
    updateButtonVisibility();
    updateGameOverOverlay();

    flap();

    lastTime = performance.now();
    animationFrame = requestAnimationFrame(gameLoop);
}

function flap() {
    if (state !== "playing") {
        return;
    }

    bird.velocity = settings.flap;
    bird.flapTime = 0.14;
}

function endGame() {
    if (state !== "playing") {
        return;
    }

    state = "over";
    cancelAnimationFrame(animationFrame);

    const isNewBest = score > best;

    if (isNewBest) {
        best = score;
        localStorage.setItem(BEST_KEY, String(best));
        bestValue.textContent = String(best);
        updateGameStatus("NEW BEST", true);
    } else {
        updateGameStatus("GAME OVER");
    }

    gameButton.textContent = "START GAME";
    gameButton.setAttribute("aria-label", "Start Flappy Zero game");

    updateButtonVisibility();
    updateGameOverOverlay();
    draw();
}

function getDifficulty() {
    return Math.min(score / settings.maxDifficulty, 1);
}

function getPipeGap() {
    const difficulty = getDifficulty();
    const difficultyGap = settings.pipeGap - difficulty * 10;
    const mobileResponsiveGap = Math.max(
        settings.mobileMinPipeGap,
        height * settings.mobileGapRatio
    );

    return Math.min(
        difficultyGap,
        mobileResponsiveGap
    );
}

function getPipeSpeed() {
    const difficulty = getDifficulty();
    return settings.pipeSpeed * (1 + difficulty * 0.16);
}

function getPipeInterval() {
    const difficulty = getDifficulty();
    return settings.pipeInterval - difficulty * 70;
}

function getPipeCenterLimits(gap) {
    const responsiveMargin = Math.max(
        settings.mobileMinMargin,
        Math.min(
            settings.minPipeTop,
            height * settings.mobileMarginRatio
        )
    );

    const minCenter =
        responsiveMargin + gap * 0.5;

    const maxCenter =
        height -
        settings.groundHeight -
        responsiveMargin -
        gap * 0.5;

    return {
        min: minCenter,
        max: Math.max(minCenter, maxCenter)
    };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function createFirstPipeCenter(limits) {
    const preferredCenter =
        height * settings.preferredFirstPipePosition;

    const range = Math.min(
        settings.firstPipeCenterRange,
        Math.max(0, (limits.max - limits.min) * 0.24)
    );

    return clamp(
        preferredCenter +
            (Math.random() * 2 - 1) * range,
        limits.min,
        limits.max
    );
}

function choosePipeDirection(limits) {
    const range = limits.max - limits.min;

    if (range <= 0) {
        return 0;
    }

    const normalized =
        (previousPipeCenter - limits.min) / range;

    if (normalized < 0.25) {
        return 1;
    }

    if (normalized > 0.75) {
        return -1;
    }

    if (
        previousPipeDirection !== 0 &&
        sameDirectionCount >= settings.maxSameDirection
    ) {
        return -previousPipeDirection;
    }

    if (previousPipeDirection === 0) {
        return Math.random() < 0.5 ? -1 : 1;
    }

    const keepDirectionChance =
        sameDirectionCount === 1 ? 0.35 : 0.2;

    return Math.random() < keepDirectionChance
        ? previousPipeDirection
        : -previousPipeDirection;
}

function getPipeShift(limits) {
    const range = limits.max - limits.min;
    const difficulty = getDifficulty();

    const minimum =
        settings.minPipeCenterShift +
        difficulty * 5;

    const maximum =
        settings.maxPipeCenterShift +
        difficulty * 7;

    const usableMinimum = Math.min(
        minimum,
        range * 0.72
    );

    const availableMaximum = Math.min(
        maximum,
        Math.max(usableMinimum, range * 0.82)
    );

    return usableMinimum +
        Math.random() *
        Math.max(
            1,
            availableMaximum - usableMinimum
        );
}

function createPipe() {
    const gap = getPipeGap();
    const limits = getPipeCenterLimits(gap);

    let center;

    if (previousPipeCenter === null) {
        center = createFirstPipeCenter(limits);
        previousPipeDirection = 0;
        sameDirectionCount = 0;
    } else {
        let direction = choosePipeDirection(limits);
        const shift = getPipeShift(limits);

        let nextCenter =
            previousPipeCenter +
            direction * shift;

        if (
            nextCenter < limits.min ||
            nextCenter > limits.max
        ) {
            direction = -direction;

            nextCenter =
                previousPipeCenter +
                direction * shift;
        }

        if (
            nextCenter < limits.min ||
            nextCenter > limits.max
        ) {
            nextCenter = clamp(
                nextCenter,
                limits.min,
                limits.max
            );
        }

        center = nextCenter;

        const actualShift =
            center - previousPipeCenter;

        const actualDirection =
            actualShift === 0
                ? 0
                : actualShift > 0
                    ? 1
                    : -1;

        if (actualDirection === previousPipeDirection) {
            sameDirectionCount += 1;
        } else {
            sameDirectionCount =
                actualDirection === 0 ? 0 : 1;
        }

        previousPipeDirection = actualDirection;
    }

    const top =
        center - gap * 0.5;

    previousPipeCenter = center;

    pipes.push({
        x: width + settings.pipeWidth,
        top,
        bottom: top + gap,
        passed: false
    });
}

function update(delta) {
    bird.velocity += settings.gravity * delta;
    bird.y += bird.velocity * delta;

    bird.rotation = Math.max(
        -0.4,
        Math.min(0.9, bird.velocity * 1.45)
    );

    if (bird.flapTime > 0) {
        bird.flapTime -= delta / 1000;
    }

    pipeTimer += delta;

    const pipeInterval =
        pipes.length === 0
            ? settings.firstPipeDelay
            : getPipeInterval();

    if (pipeTimer >= pipeInterval) {
        pipeTimer -= pipeInterval;
        createPipe();
    }

    const speed =
        getPipeSpeed() * delta;

    for (let i = pipes.length - 1; i >= 0; i -= 1) {
        const pipe = pipes[i];

        pipe.x -= speed;

        if (
            !pipe.passed &&
            pipe.x + settings.pipeWidth < bird.x
        ) {
            pipe.passed = true;
            score += 1;
            updateScoreDisplay();
        }

        if (
            pipe.x + settings.pipeWidth < -30
        ) {
            pipes.splice(i, 1);
        }
    }

    const ceilingHit =
        bird.y - bird.radius <= 0;

    const groundY =
        height - settings.groundHeight;

    const groundHit =
        bird.y + bird.radius >= groundY;

    if (ceilingHit || groundHit) {
        endGame();
        return;
    }

    const hitRadius =
        bird.radius - 4;

    const birdLeft =
        bird.x - hitRadius;

    const birdRight =
        bird.x + hitRadius;

    const birdTop =
        bird.y - hitRadius;

    const birdBottom =
        bird.y + hitRadius;

    for (const pipe of pipes) {
        const pipeLeft = pipe.x;

        const pipeRight =
            pipe.x + settings.pipeWidth;

        const overlapsX =
            birdRight > pipeLeft &&
            birdLeft < pipeRight;

        const overlapsTop =
            birdTop < pipe.top;

        const overlapsBottom =
            birdBottom > pipe.bottom;

        if (
            overlapsX &&
            (overlapsTop || overlapsBottom)
        ) {
            endGame();
            return;
        }
    }
}

function drawBackground() {
    const panel = getCss("--panel");
    const muted = getCss("--muted");

    ctx.fillStyle = panel;

    ctx.fillRect(
        0,
        0,
        width,
        height
    );

    ctx.globalAlpha = 0.08;
    ctx.fillStyle = muted;

    const lineSpacing = 38;

    for (
        let y = lineSpacing;
        y < height - settings.groundHeight;
        y += lineSpacing
    ) {
        ctx.fillRect(
            0,
            y,
            width,
            1
        );
    }

    ctx.globalAlpha = 1;
}

function drawPipe(x, top, bottom) {
    const pipeColor = getCss("--text");
    const capHeight = 10;
    const capWidth = 56;

    const capOffset =
        (capWidth - settings.pipeWidth) / 2;

    ctx.fillStyle = pipeColor;

    ctx.fillRect(
        x,
        0,
        settings.pipeWidth,
        top
    );

    ctx.fillRect(
        x - capOffset,
        Math.max(0, top - capHeight),
        capWidth,
        capHeight
    );

    ctx.fillRect(
        x,
        bottom,
        settings.pipeWidth,
        height -
            settings.groundHeight -
            bottom
    );

    ctx.fillRect(
        x - capOffset,
        bottom,
        capWidth,
        capHeight
    );
}

function drawPipes() {
    for (const pipe of pipes) {
        drawPipe(
            pipe.x,
            pipe.top,
            pipe.bottom
        );
    }
}

function drawGround() {
    const groundY =
        height - settings.groundHeight;

    const text = getCss("--text");

    ctx.fillStyle = text;

    ctx.fillRect(
        0,
        groundY,
        width,
        settings.groundHeight
    );

    ctx.globalAlpha = 0.15;
    ctx.fillStyle = getCss("--panel");

    const stripeWidth = 18;

    for (
        let x = -stripeWidth;
        x < width + stripeWidth;
        x += stripeWidth * 2
    ) {
        ctx.fillRect(
            x,
            groundY,
            stripeWidth,
            2
        );
    }

    ctx.globalAlpha = 1;
}

function drawBird() {
    ctx.save();

    const idleOffset =
        state === "idle"
            ? Math.sin(idleTime * 0.004) * 3
            : 0;

    ctx.translate(
        bird.x,
        bird.y + idleOffset
    );

    ctx.rotate(bird.rotation);

    const text = getCss("--text");
    const panel = getCss("--panel");

    ctx.fillStyle = text;

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        bird.radius,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = panel;

    ctx.beginPath();

    ctx.arc(
        5,
        -5,
        3.1,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = text;

    ctx.beginPath();

    ctx.arc(
        5.7,
        -5,
        1.2,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.beginPath();

    ctx.moveTo(10, 0);
    ctx.lineTo(17, 3.5);
    ctx.lineTo(10, 6);
    ctx.closePath();

    ctx.fill();

    const wingLift =
        bird.flapTime > 0
            ? -4
            : 1;

    ctx.globalAlpha = 0.9;

    ctx.beginPath();

    ctx.ellipse(
        -4,
        wingLift + 3,
        7,
        3.5,
        -0.25,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
}

function draw() {
    if (!width || !height) {
        return;
    }

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    drawBackground();
    drawPipes();
    drawGround();
    drawBird();
}

function gameLoop(timestamp) {
    if (state !== "playing") {
        return;
    }

    const frameTime = Math.min(
        Math.max(timestamp - lastTime, 0),
        MAX_FRAME_TIME
    );

    lastTime = timestamp;
    accumulator += frameTime;

    let steps = 0;

    while (
        accumulator >= FIXED_STEP &&
        steps < MAX_STEPS
    ) {
        update(FIXED_STEP);

        accumulator -= FIXED_STEP;
        steps += 1;

        if (state !== "playing") {
            break;
        }
    }

    if (steps === MAX_STEPS) {
        accumulator = 0;
    }

    draw();

    if (state === "playing") {
        animationFrame =
            requestAnimationFrame(gameLoop);
    }
}

function handleGameButton() {
    if (
        state === "idle" ||
        state === "over"
    ) {
        resetGame();
        startGame();
    }
}

function handleTouchControl(event) {
    event.preventDefault();
    event.stopPropagation();

    setInputMode("touch");

    if (state !== "playing") {
        return;
    }

    touchControl.classList.add(
        "control-active"
    );

    if (touchFeedbackTimer) {
        window.clearTimeout(
            touchFeedbackTimer
        );
    }

    flap();

    touchFeedbackTimer =
        window.setTimeout(() => {
            touchControl.classList.remove(
                "control-active"
            );

            touchFeedbackTimer = 0;
        }, 90);
}

function handleKeyDown(event) {
    if (event.code !== "Space") {
        return;
    }

    if (event.repeat) {
        return;
    }

    event.preventDefault();

    setInputMode("keyboard");

    if (state === "playing") {
        flap();
    }
}

function handlePointerDown(event) {
    if (
        event.pointerType === "touch" ||
        event.pointerType === "pen"
    ) {
        setInputMode("touch");
    }
}

function handleVisibilityChange() {
    if (document.hidden) {
        if (state === "playing") {
            cancelAnimationFrame(animationFrame);
        }

        return;
    }

    if (state === "playing") {
        lastTime = performance.now();
        accumulator = 0;

        animationFrame =
            requestAnimationFrame(gameLoop);
    }

    if (state === "idle") {
        cancelAnimationFrame(animationFrame);

        animationFrame =
            requestAnimationFrame(idleAnimation);
    }
}

const themeObserver =
    new MutationObserver(() => {
        draw();
    });

themeObserver.observe(
    document.documentElement,
    {
        attributes: true,
        attributeFilter: ["data-theme"]
    }
);

gameButton.addEventListener(
    "click",
    handleGameButton
);

touchControl.addEventListener(
    "pointerdown",
    handleTouchControl
);

window.addEventListener(
    "keydown",
    handleKeyDown
);

window.addEventListener(
    "pointerdown",
    handlePointerDown
);

window.addEventListener(
    "resize",
    resizeCanvas
);

document.addEventListener(
    "visibilitychange",
    handleVisibilityChange
);

function idleAnimation(timestamp) {
    if (state !== "idle") {
        return;
    }

    idleTime = timestamp;
    draw();

    animationFrame =
        requestAnimationFrame(
            idleAnimation
        );
}

detectInitialInputMode();
resizeCanvas();
resetGame();

animationFrame =
    requestAnimationFrame(
        idleAnimation
    );