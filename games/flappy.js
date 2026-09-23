const gameArea = document.getElementById("gameArea");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameButton = document.getElementById("gameButton");
const touchControlWrap = document.getElementById("touchControlWrap");
const touchControl = document.getElementById("touchControl");
const gameOverlay = document.getElementById("gameOverlay");
const overlayLabel = document.getElementById("overlayLabel");
const overlayText = document.getElementById("overlayText");
const gameStatus = document.getElementById("gameStatus");
const scoreValue = document.getElementById("scoreValue");
const bestValue = document.getElementById("bestValue");

const BEST_KEY = "zero-arcade-flappy-best";

let width = 0;
let height = 0;
let dpr = 1;
let animationFrame = 0;
let lastTime = 0;
let state = "idle";
let score = 0;
let best = Number(localStorage.getItem(BEST_KEY)) || 0;
let pipeTimer = 0;
let inputMode = "keyboard";

const bird = {
    x: 0,
    y: 0,
    radius: 13,
    velocity: 0
};

const pipes = [];

const settings = {
    gravity: 0.00145,
    flap: -0.43,
    pipeSpeed: 0.16,
    pipeWidth: 48,
    pipeGap: 145,
    pipeInterval: 1450,
    groundHeight: 18
};

bestValue.textContent = String(best);

function getCss(variable) {
    return getComputedStyle(document.documentElement)
        .getPropertyValue(variable)
        .trim();
}

function setInputMode(mode) {
    inputMode = mode;
    touchControlWrap.classList.toggle("is-visible", mode === "touch");
}

function detectInitialInputMode() {
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const touchCapable = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    setInputMode(coarsePointer || touchCapable ? "touch" : "keyboard");
}

function handlePointerMode(event) {
    if (event.pointerType === "touch" || event.pointerType === "pen") {
        setInputMode("touch");
    }
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

function resetGame() {
    cancelAnimationFrame(animationFrame);

    state = "idle";
    score = 0;
    pipeTimer = 0;
    pipes.length = 0;

    bird.x = width * 0.25;
    bird.y = height * 0.45;
    bird.velocity = 0;

    scoreValue.textContent = "0";
    gameStatus.textContent = "";
    gameStatus.className = "game-status";

    gameButton.textContent = "START GAME";
    gameButton.setAttribute("aria-label", "Start Flappy Zero game");

    overlayLabel.textContent = "READY";
    overlayText.textContent = inputMode === "touch"
        ? "Use the touch control to flap."
        : "Press Space to flap.";

    gameOverlay.classList.remove("is-hidden");

    draw();
}

function startGame() {
    if (state === "playing") {
        return;
    }

    state = "playing";
    score = 0;
    pipeTimer = 0;
    pipes.length = 0;

    bird.x = width * 0.25;
    bird.y = height * 0.45;
    bird.velocity = 0;

    scoreValue.textContent = "0";
    gameStatus.textContent = "";
    gameStatus.className = "game-status";

    gameButton.textContent = "NEW GAME";
    gameButton.setAttribute("aria-label", "Start a new Flappy Zero game");

    gameOverlay.classList.add("is-hidden");

    lastTime = performance.now();
    flap();

    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(gameLoop);
}

function flap() {
    if (state !== "playing") {
        return;
    }

    bird.velocity = settings.flap;
}

function endGame() {
    if (state !== "playing") {
        return;
    }

    state = "over";

    if (score > best) {
        best = score;
        localStorage.setItem(BEST_KEY, String(best));
        bestValue.textContent = String(best);
        gameStatus.textContent = "NEW BEST";
        gameStatus.className = "game-status best";
    } else {
        gameStatus.textContent = "GAME OVER";
        gameStatus.className = "game-status";
    }

    overlayLabel.textContent = "GAME OVER";
    overlayText.textContent = `Score ${score} · Best ${best}`;

    gameOverlay.classList.remove("is-hidden");

    gameButton.textContent = "NEW GAME";
    gameButton.setAttribute("aria-label", "Start a new Flappy Zero game");

    draw();
}

function createPipe() {
    const minTop = 42;
    const maxTop = Math.max(
        minTop,
        height - settings.groundHeight - settings.pipeGap - 42
    );

    const top = minTop + Math.random() * Math.max(1, maxTop - minTop);

    pipes.push({
        x: width + settings.pipeWidth,
        top,
        bottom: top + settings.pipeGap,
        passed: false
    });
}

function update(delta) {
    bird.velocity += settings.gravity * delta;
    bird.y += bird.velocity * delta;

    pipeTimer += delta;

    if (pipeTimer >= settings.pipeInterval) {
        pipeTimer = 0;
        createPipe();
    }

    const speed = settings.pipeSpeed * delta;

    for (let i = pipes.length - 1; i >= 0; i -= 1) {
        const pipe = pipes[i];

        pipe.x -= speed;

        if (!pipe.passed && pipe.x + settings.pipeWidth < bird.x) {
            pipe.passed = true;
            score += 1;
            scoreValue.textContent = String(score);
        }

        if (pipe.x + settings.pipeWidth < -20) {
            pipes.splice(i, 1);
        }
    }

    const ceilingHit = bird.y - bird.radius <= 0;
    const groundY = height - settings.groundHeight;
    const groundHit = bird.y + bird.radius >= groundY;

    if (ceilingHit || groundHit) {
        endGame();
        return;
    }

    for (const pipe of pipes) {
        const birdLeft = bird.x - bird.radius + 3;
        const birdRight = bird.x + bird.radius - 3;
        const birdTop = bird.y - bird.radius + 3;
        const birdBottom = bird.y + bird.radius - 3;

        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + settings.pipeWidth;

        const overlapsX = birdRight > pipeLeft && birdLeft < pipeRight;
        const overlapsTop = birdTop < pipe.top;
        const overlapsBottom = birdBottom > pipe.bottom;

        if (overlapsX && (overlapsTop || overlapsBottom)) {
            endGame();
            return;
        }
    }
}

function drawBackground() {
    ctx.fillStyle = getCss("--panel");
    ctx.fillRect(0, 0, width, height);
}

function drawPipes() {
    const pipeColor = getCss("--text");
    const groundY = height - settings.groundHeight;

    ctx.fillStyle = pipeColor;

    for (const pipe of pipes) {
        ctx.fillRect(
            pipe.x,
            0,
            settings.pipeWidth,
            pipe.top
        );

        ctx.fillRect(
            pipe.x,
            pipe.bottom,
            settings.pipeWidth,
            groundY - pipe.bottom
        );
    }
}

function drawGround() {
    const groundY = height - settings.groundHeight;

    ctx.fillStyle = getCss("--text");
    ctx.fillRect(
        0,
        groundY,
        width,
        settings.groundHeight
    );
}

function drawBird() {
    ctx.save();

    ctx.translate(bird.x, bird.y);

    const angle = Math.max(
        -0.35,
        Math.min(0.8, bird.velocity * 0.9)
    );

    ctx.rotate(angle);

    ctx.fillStyle = getCss("--text");

    ctx.beginPath();
    ctx.arc(
        0,
        0,
        bird.radius,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = getCss("--panel");

    ctx.beginPath();
    ctx.arc(
        5,
        -5,
        3.1,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = getCss("--text");

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

    ctx.restore();
}

function draw() {
    if (!width || !height) {
        return;
    }

    ctx.clearRect(0, 0, width, height);

    drawBackground();
    drawPipes();
    drawGround();
    drawBird();
}

function gameLoop(timestamp) {
    if (state !== "playing") {
        return;
    }

    const delta = Math.min(timestamp - lastTime, 32);

    lastTime = timestamp;

    update(delta);
    draw();

    if (state === "playing") {
        animationFrame = requestAnimationFrame(gameLoop);
    }
}

function handleGameButton() {
    if (state === "idle") {
        startGame();
        return;
    }

    if (state === "over") {
        resetGame();
        startGame();
    }
}

function handleTouchControl(event) {
    event.preventDefault();

    setInputMode("touch");

    touchControl.classList.add("control-active");

    if (state === "idle") {
        startGame();
        return;
    }

    if (state === "playing") {
        flap();
    }

    window.setTimeout(() => {
        touchControl.classList.remove("control-active");
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

    if (state === "idle") {
        startGame();
        return;
    }

    if (state === "playing") {
        flap();
        return;
    }

    if (state === "over") {
        resetGame();
        startGame();
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

const themeObserver = new MutationObserver(() => {
    draw();
});

themeObserver.observe(
    document.documentElement,
    {
        attributes: true,
        attributeFilter: ["data-theme"]
    }
);

gameButton.addEventListener("click", handleGameButton);
touchControl.addEventListener("pointerdown", handleTouchControl);

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("pointerdown", handlePointerDown);
window.addEventListener("resize", resizeCanvas);

resetGame();
detectInitialInputMode();
resizeCanvas();