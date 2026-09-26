const canvas = document.getElementById("gameCanvas");
const gameArea = document.getElementById("gameArea");
const gameOverlay = document.getElementById("gameOverlay");
const gameButton = document.getElementById("gameButton");
const touchControlWrap = document.getElementById("touchControlWrap");
const touchControl = document.getElementById("touchControl");
const scoreValue = document.getElementById("scoreValue");
const bestValue = document.getElementById("bestValue");
const gameStatus = document.getElementById("gameStatus");
const scoreItem = document.getElementById("scoreItem");
const context = canvas.getContext("2d");
const STORAGE_KEY = "zero-arcade-flappy-best";

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
    firstPipeCenterRange: 34,
    preferredFirstPipePosition: 0.45,
    recentPipeMemory: 3,
    pipeCandidateCount: 30,
    pipeRandomness: 0.9,
    pipeNoveltyWeight: 1.45,
    pipeMovementWeight: 0.9,
    pipeVariationWeight: 0.55
};

let width = 0;
let height = 0;
let scale = 1;
let animationFrame = null;
let lastTime = 0;
let pipeTimer = 0;
let firstPipeTimer = 0;
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY)) || 0;
let gameState = "ready";
let bird = null;
let pipes = [];
let previousPipeCenter = null;
let recentPipeCenters = [];

bestValue.textContent = best;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function lerp(a, b, amount) {
    return a + (b - a) * amount;
}

function randomBetween(min, max) {
    return min + Math.random() * Math.max(0, max - min);
}

function getDifficulty() {
    return clamp(Math.floor(score / 5), 0, settings.maxDifficulty);
}

function getResponsiveGap() {
    if (!width || !height) {
        return settings.pipeGap;
    }

    const isSmallArea = width <= 520;

    if (!isSmallArea) {
        return settings.pipeGap;
    }

    return Math.max(
        settings.mobileMinPipeGap,
        Math.min(settings.pipeGap, height * settings.mobileGapRatio)
    );
}

function getPipeCenterLimits(gap) {
    const responsiveMargin = Math.max(
        settings.mobileMinMargin,
        Math.min(settings.minPipeTop, height * settings.mobileMarginRatio)
    );

    const minCenter = responsiveMargin + gap * 0.5;
    const maxCenter = height - settings.groundHeight - responsiveMargin - gap * 0.5;

    return {
        min: minCenter,
        max: Math.max(minCenter, maxCenter)
    };
}

function getPipeMovementRange(limits) {
    const range = Math.max(0, limits.max - limits.min);
    const difficulty = getDifficulty();
    const minimumRatio = 0.07 + difficulty * 0.0015;
    const maximumRatio = 0.42 + difficulty * 0.008;

    const minimum = Math.min(
        range * minimumRatio,
        range * 0.16
    );

    const maximum = Math.min(
        range * 0.62,
        range * maximumRatio,
        42 + difficulty * 3.5
    );

    return {
        min: Math.max(0, minimum),
        max: Math.max(minimum, maximum)
    };
}

function getRandomPipeCenter(limits) {
    return randomBetween(limits.min, limits.max);
}

function createFirstPipeCenter(limits) {
    const center = lerp(
        limits.min,
        limits.max,
        settings.preferredFirstPipePosition
    );

    return clamp(
        center + randomBetween(
            -settings.firstPipeCenterRange,
            settings.firstPipeCenterRange
        ),
        limits.min,
        limits.max
    );
}

function getRecentDistance(candidate) {
    if (recentPipeCenters.length === 0) {
        return 1;
    }

    const distances = recentPipeCenters.map(
        (center) => Math.abs(candidate - center)
    );

    return Math.min(...distances);
}

function scorePipeCandidate(candidate, limits, movementRange) {
    if (previousPipeCenter === null) {
        return 1;
    }

    const range = Math.max(1, limits.max - limits.min);
    const distance = Math.abs(candidate - previousPipeCenter);

    const movementTarget = clamp(
        movementRange.min +
            (movementRange.max - movementRange.min) * 0.52,
        0,
        range
    );

    const movementSpread = Math.max(
        range * 0.16,
        movementRange.max * 0.45,
        1
    );

    const movementPreference = Math.exp(
        -Math.pow(
            (distance - movementTarget) / movementSpread,
            2
        )
    );

    const recentDistance = getRecentDistance(candidate) / range;

    const recentPenalty =
        recentDistance < 0.1
            ? (0.1 - recentDistance) * 8
            : 0;

    const edgeDistance =
        Math.min(
            candidate - limits.min,
            limits.max - candidate
        ) / range;

    const edgePreference = clamp(
        edgeDistance * 2,
        0,
        1
    );

    if (
        distance < movementRange.min * 0.35 &&
        range > 1
    ) {
        return -2;
    }

    if (
        distance > movementRange.max * 1.12
    ) {
        return -2;
    }

    return (
        movementPreference * settings.pipeMovementWeight +
        recentDistance * settings.pipeNoveltyWeight +
        edgePreference * settings.pipeVariationWeight -
        recentPenalty +
        Math.random() * settings.pipeRandomness
    );
}

function chooseNextPipeCenter(limits) {
    if (previousPipeCenter === null) {
        return createFirstPipeCenter(limits);
    }

    const range = limits.max - limits.min;

    if (range <= 0) {
        return limits.min;
    }

    const movementRange = getPipeMovementRange(limits);
    const candidates = [];

    for (
        let i = 0;
        i < settings.pipeCandidateCount;
        i += 1
    ) {
        const candidate = getRandomPipeCenter(limits);
        const candidateScore = scorePipeCandidate(
            candidate,
            limits,
            movementRange
        );

        if (candidateScore > -1.5) {
            candidates.push({
                center: candidate,
                score: candidateScore
            });
        }
    }

    if (candidates.length === 0) {
        const fallbackMin = Math.max(
            limits.min,
            previousPipeCenter - movementRange.max
        );

        const fallbackMax = Math.min(
            limits.max,
            previousPipeCenter + movementRange.max
        );

        return randomBetween(
            fallbackMin,
            fallbackMax
        );
    }

    candidates.sort(
        (a, b) => b.score - a.score
    );

    const topCount = Math.max(
        5,
        Math.ceil(candidates.length * 0.38)
    );

    const topCandidates = candidates.slice(
        0,
        topCount
    );

    const totalWeight = topCandidates.reduce(
        (sum, candidate) =>
            sum + Math.max(0.05, candidate.score + 2),
        0
    );

    let pick = Math.random() * totalWeight;

    for (const candidate of topCandidates) {
        pick -= Math.max(
            0.05,
            candidate.score + 2
        );

        if (pick <= 0) {
            return candidate.center;
        }
    }

    return topCandidates[
        topCandidates.length - 1
    ].center;
}

function rememberPipeCenter(center) {
    previousPipeCenter = center;
    recentPipeCenters.push(center);

    if (
        recentPipeCenters.length >
        settings.recentPipeMemory
    ) {
        recentPipeCenters.shift();
    }
}

function createPipe() {
    const gap = getResponsiveGap();
    const limits = getPipeCenterLimits(gap);
    const center = chooseNextPipeCenter(limits);

    pipes.push({
        x: width + settings.pipeWidth,
        center,
        gap,
        scored: false
    });

    rememberPipeCenter(center);
}

function resetBird() {
    bird = {
        x: width * 0.25,
        y: height * 0.45,
        radius: clamp(width * 0.028, 10, 15),
        velocity: 0,
        rotation: 0
    };
}

function resetGame() {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
    lastTime = 0;
    pipeTimer = 0;
    firstPipeTimer = 0;
    score = 0;
    pipes = [];
    previousPipeCenter = null;
    recentPipeCenters = [];
    gameState = "ready";
    scoreValue.textContent = score;
    bestValue.textContent = best;
    gameOverlay.classList.remove("is-game-over");
    gameButton.classList.remove("is-hidden");
    gameButton.textContent = "START GAME";
    gameButton.setAttribute(
        "aria-label",
        "Start Flappy Zero game"
    );
    gameStatus.textContent = "";
    gameStatus.classList.remove(
        "best",
        "status-pop"
    );
    scoreItem.classList.remove("score-pop");
    resetBird();
    draw();
}

function startGame() {
    if (gameState === "playing") {
        flap();
        return;
    }

    if (gameState === "gameover") {
        resetGame();
    }

    gameState = "playing";
    gameButton.classList.add("is-hidden");
    gameButton.setAttribute(
        "aria-label",
        "Restart Flappy Zero game"
    );
    gameOverlay.classList.remove(
        "is-game-over"
    );
    gameStatus.textContent = "";
    gameStatus.classList.remove(
        "best",
        "status-pop"
    );
    firstPipeTimer = settings.firstPipeDelay;
    pipeTimer = 0;
    resetBird();
    flap();
    lastTime = performance.now();
    animationFrame = requestAnimationFrame(
        gameLoop
    );
}

function submitScore(finalScore) {
    fetch("/api/scores", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify({
            gameKey: "flappy",
            score: finalScore
        })
    }).catch(() => {});
}
function endGame() {
    if (gameState !== "playing") {
        return;
    }

    gameState = "gameover";
    gameOverlay.classList.add(
        "is-game-over"
    );
    gameButton.classList.remove(
        "is-hidden"
    );
    gameButton.textContent = "START GAME";
    gameButton.setAttribute(
        "aria-label",
        "Start Flappy Zero game"
    );
    gameStatus.textContent =
        score > 0
            ? `GAME OVER SCORE ${score}`
            : "GAME OVER";
    gameStatus.classList.remove(
        "best",
        "status-pop"
    );
    void gameStatus.offsetWidth;
    gameStatus.classList.add(
        "status-pop"
    );

    if (score > best) {
        best = score;
        localStorage.setItem(
            STORAGE_KEY,
            String(best)
        );
        bestValue.textContent = best;
        gameStatus.textContent =
            `NEW BEST ${best}`;
        gameStatus.classList.add(
            "best"
        );
    }

    submitScore(score);
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
    draw();
}

function flap() {
    if (gameState !== "playing") {
        return;
    }

    bird.velocity = settings.flap;
    bird.rotation = -0.45;
    touchControl.classList.add(
        "control-active"
    );

    clearTimeout(flap.activeTimer);

    flap.activeTimer = setTimeout(() => {
        touchControl.classList.remove(
            "control-active"
        );
    }, 100);
}

function update(delta) {
    if (!bird) {
        return;
    }

    const difficulty = getDifficulty();

    const gravity =
        settings.gravity *
        (1 + difficulty * 0.035);

    const speed =
        settings.pipeSpeed *
        (1 + difficulty * 0.018);

    bird.velocity += gravity * delta;
    bird.y += bird.velocity * delta;

    bird.rotation = lerp(
        bird.rotation,
        clamp(
            bird.velocity * 1.25,
            -0.45,
            1.15
        ),
        Math.min(1, delta * 0.008)
    );

    if (firstPipeTimer > 0) {
        firstPipeTimer -= delta;
    } else {
        pipeTimer += delta;

        if (
            pipeTimer >=
            settings.pipeInterval
        ) {
            pipeTimer -=
                settings.pipeInterval;
            createPipe();
        }
    }

    pipes.forEach((pipe) => {
        pipe.x -= speed * delta;

        if (
            !pipe.scored &&
            pipe.x + settings.pipeWidth <
                bird.x
        ) {
            pipe.scored = true;
            score += 1;
            scoreValue.textContent =
                score;

            scoreItem.classList.remove(
                "score-pop"
            );

            void scoreItem.offsetWidth;

            scoreItem.classList.add(
                "score-pop"
            );
        }
    });

    pipes = pipes.filter(
        (pipe) =>
            pipe.x + settings.pipeWidth >
            -20
    );

    if (checkCollision()) {
        endGame();
    }
}

function checkCollision() {
    if (!bird) {
        return false;
    }

    if (
        bird.y - bird.radius <= 0
    ) {
        return true;
    }

    if (
        bird.y + bird.radius >=
        height - settings.groundHeight
    ) {
        return true;
    }

    for (const pipe of pipes) {
        const pipeRight =
            pipe.x + settings.pipeWidth;

        const birdRight =
            bird.x + bird.radius;

        const birdLeft =
            bird.x - bird.radius;

        if (
            birdRight < pipe.x ||
            birdLeft > pipeRight
        ) {
            continue;
        }

        const gapTop =
            pipe.center -
            pipe.gap * 0.5;

        const gapBottom =
            pipe.center +
            pipe.gap * 0.5;

        if (
            bird.y - bird.radius <
                gapTop ||
            bird.y + bird.radius >
                gapBottom
        ) {
            return true;
        }
    }

    return false;
}

function getThemeColors() {
    const dark =
        document.documentElement.dataset.theme ===
        "dark";

    return {
        background: dark
            ? "#191919"
            : "#fafaf8",
        grid: dark
            ? "rgba(255,255,255,0.035)"
            : "rgba(0,0,0,0.035)",
        pipe: dark
            ? "#f5f5f3"
            : "#101010",
        pipeSoft: "#777777",
        bird: dark
            ? "#f5f5f3"
            : "#101010",
        eye: dark
            ? "#101010"
            : "#f5f5f3",
        accent: dark
            ? "#5b9cff"
            : "#3b82f6"
    };
}

function drawBackground(colors) {
    context.fillStyle =
        colors.background;

    context.fillRect(
        0,
        0,
        width,
        height
    );

    context.strokeStyle =
        colors.grid;

    context.lineWidth = 1;

    const gridSize =
        Math.max(
            22,
            width / 14
        );

    for (
        let x = 0;
        x <= width;
        x += gridSize
    ) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
    }

    for (
        let y = 0;
        y <= height;
        y += gridSize
    ) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
    }
}

function drawPipe(pipe, colors) {
    const gapTop =
        pipe.center -
        pipe.gap * 0.5;

    const gapBottom =
        pipe.center +
        pipe.gap * 0.5;

    const bodyWidth =
        settings.pipeWidth * 0.72;

    const capWidth =
        settings.pipeWidth;

    const capHeight =
        Math.max(
            12,
            settings.pipeWidth * 0.28
        );

    const bodyX =
        pipe.x +
        (settings.pipeWidth -
            bodyWidth) *
        0.5;

    const capX = pipe.x;

    context.fillStyle =
        colors.pipe;

    context.fillRect(
        bodyX,
        0,
        bodyWidth,
        Math.max(0, gapTop)
    );

    context.fillRect(
        bodyX,
        gapBottom,
        bodyWidth,
        Math.max(
            0,
            height -
                settings.groundHeight -
                gapBottom
        )
    );

    context.fillRect(
        capX,
        Math.max(
            0,
            gapTop - capHeight
        ),
        capWidth,
        capHeight
    );

    context.fillRect(
        capX,
        gapBottom,
        capWidth,
        capHeight
    );

    context.strokeStyle =
        colors.pipeSoft;

    context.lineWidth = 1;

    context.strokeRect(
        capX + 0.5,
        Math.max(
            0,
            gapTop - capHeight
        ) + 0.5,
        capWidth - 1,
        capHeight - 1
    );

    context.strokeRect(
        capX + 0.5,
        gapBottom + 0.5,
        capWidth - 1,
        capHeight - 1
    );
}

function drawBird(colors) {
    if (!bird) {
        return;
    }

    context.save();

    context.translate(
        bird.x,
        bird.y
    );

    context.rotate(
        bird.rotation
    );

    context.fillStyle =
        colors.bird;

    context.beginPath();

    context.arc(
        0,
        0,
        bird.radius,
        0,
        Math.PI * 2
    );

    context.fill();

    context.fillStyle =
        colors.eye;

    context.beginPath();

    context.arc(
        bird.radius * 0.36,
        -bird.radius * 0.34,
        bird.radius * 0.23,
        0,
        Math.PI * 2
    );

    context.fill();

    context.fillStyle =
        colors.accent;

    context.beginPath();

    context.arc(
        bird.radius * 0.39,
        -bird.radius * 0.34,
        bird.radius * 0.09,
        0,
        Math.PI * 2
    );

    context.fill();

    context.fillStyle =
        colors.pipeSoft;

    context.beginPath();

    context.moveTo(
        bird.radius * 0.9,
        -bird.radius * 0.08
    );

    context.lineTo(
        bird.radius * 1.45,
        0
    );

    context.lineTo(
        bird.radius * 0.9,
        bird.radius * 0.25
    );

    context.closePath();
    context.fill();

    context.restore();
}

function drawGround(colors) {
    const groundY =
        height -
        settings.groundHeight;

    context.fillStyle =
        colors.pipe;

    context.fillRect(
        0,
        groundY,
        width,
        settings.groundHeight
    );

    context.fillStyle =
        colors.grid;

    context.fillRect(
        0,
        groundY,
        width,
        1
    );
}

function draw() {
    if (!width || !height) {
        return;
    }

    const colors =
        getThemeColors();

    context.setTransform(
        scale,
        0,
        0,
        scale,
        0,
        0
    );

    context.clearRect(
        0,
        0,
        width,
        height
    );

    drawBackground(colors);

    pipes.forEach(
        (pipe) =>
            drawPipe(
                pipe,
                colors
            )
    );

    drawGround(colors);
    drawBird(colors);
}

function resizeCanvas() {
    const rect =
        gameArea.getBoundingClientRect();

    const nextWidth =
        Math.max(
            1,
            rect.width
        );

    const nextHeight =
        Math.max(
            1,
            rect.height
        );

    const oldWidth = width;
    const oldHeight = height;

    width = nextWidth;
    height = nextHeight;

    scale = Math.min(
        window.devicePixelRatio || 1,
        2
    );

    canvas.width =
        Math.round(
            width * scale
        );

    canvas.height =
        Math.round(
            height * scale
        );

    if (
        bird &&
        oldWidth &&
        oldHeight
    ) {
        const xRatio =
            width / oldWidth;

        const yRatio =
            height / oldHeight;

        bird.x *= xRatio;
        bird.y *= yRatio;

        bird.radius =
            clamp(
                width * 0.028,
                10,
                15
            );

        pipes.forEach(
            (pipe) => {
                pipe.x *= xRatio;
                pipe.center *= yRatio;
                pipe.gap =
                    getResponsiveGap();
            }
        );

        previousPipeCenter =
            pipes.length
                ? pipes[
                      pipes.length - 1
                  ].center
                : previousPipeCenter;

        recentPipeCenters =
            recentPipeCenters.map(
                (center) =>
                    center * yRatio
            );
    } else {
        resetBird();
    }

    draw();
}

function gameLoop(timestamp) {
    if (gameState !== "playing") {
        return;
    }

    const delta =
        Math.min(
            32,
            Math.max(
                0,
                timestamp - lastTime
            )
        );

    lastTime = timestamp;
    update(delta);
    draw();

    if (
        gameState === "playing"
    ) {
        animationFrame =
            requestAnimationFrame(
                gameLoop
            );
    }
}

function handleGameInput(event) {
    if (
        event.type === "keydown"
    ) {
        if (
            event.code !== "Space" &&
            event.code !== "ArrowUp"
        ) {
            return;
        }

        event.preventDefault();

        if (gameState !== "playing") {
            return;
        }

        flap();
        return;
    }

    if (gameState !== "playing") {
        return;
    }

    flap();
}

function showTouchControl() {
    const coarse =
        window.matchMedia(
            "(hover: none) and (pointer: coarse)"
        ).matches;

    touchControlWrap.classList.toggle(
        "is-visible",
        coarse
    );
}

function refreshThemeDraw() {
    if (
        gameState !== "playing"
    ) {
        draw();
    }
}

gameButton.addEventListener(
    "click",
    startGame
);

touchControl.addEventListener(
    "pointerdown",
    (event) => {
        event.preventDefault();
        handleGameInput(event);
    }
);

gameArea.addEventListener(
    "pointerdown",
    (event) => {
        if (
            event.target ===
            touchControl
        ) {
            return;
        }

        if (
            window.matchMedia(
                "(hover: none) and (pointer: coarse)"
            ).matches
        ) {
            event.preventDefault();
            handleGameInput(event);
        }
    }
);

window.addEventListener(
    "keydown",
    handleGameInput,
    { passive: false }
);

window.addEventListener(
    "resize",
    () => {
        showTouchControl();
        resizeCanvas();
    }
);

window.addEventListener(
    "storage",
    refreshThemeDraw
);

if (window.matchMedia) {
    const themeMedia =
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        );

    themeMedia.addEventListener?.(
        "change",
        refreshThemeDraw
    );
}

const themeObserver =
    new MutationObserver(
        refreshThemeDraw
    );

themeObserver.observe(
    document.documentElement,
    {
        attributes: true,
        attributeFilter: [
            "data-theme"
        ]
    }
);

showTouchControl();
resizeCanvas();
resetGame();