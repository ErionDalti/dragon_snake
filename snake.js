(() => {
  const GRID_SIZE = 20;
  const CELL_SIZE = 20;
  const TICK_MS = 120;
  const INITIAL_SEED = 1337;

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const OPPOSITE = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  };

  function lcg(seed) {
    const next = (seed * 1664525 + 1013904223) >>> 0;
    return { next, value: next / 0xffffffff };
  }

  function randomInt(seed, maxExclusive) {
    const step = lcg(seed);
    return { seed: step.next, value: Math.floor(step.value * maxExclusive) };
  }

  function pointKey(p) {
    return `${p.x},${p.y}`;
  }

  function createInitialState() {
    const start = { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) };
    const snake = [start, { x: start.x - 1, y: start.y }];
    const seed = INITIAL_SEED;
    const foodResult = spawnFood(seed, snake);
    return {
      snake,
      direction: "right",
      nextDirection: "right",
      food: foodResult.food,
      score: 0,
      growing: 0,
      seed: foodResult.seed,
      gameOver: false,
      paused: false,
    };
  }

  function spawnFood(seed, snake) {
    const occupied = new Set(snake.map(pointKey));
    let nextSeed = seed;
    for (let tries = 0; tries < 1000; tries += 1) {
      const rx = randomInt(nextSeed, GRID_SIZE);
      nextSeed = rx.seed;
      const ry = randomInt(nextSeed, GRID_SIZE);
      nextSeed = ry.seed;
      const food = { x: rx.value, y: ry.value };
      if (!occupied.has(pointKey(food))) {
        return { food, seed: nextSeed };
      }
    }
    return { food: { x: 0, y: 0 }, seed: nextSeed };
  }

  function setDirection(state, dir) {
    if (!DIRS[dir]) return state;
    if (OPPOSITE[dir] === state.direction) return state;
    return { ...state, nextDirection: dir };
  }

  function step(state) {
    if (state.gameOver || state.paused) return state;

    const direction = state.nextDirection;
    const head = state.snake[0];
    const delta = DIRS[direction];
    const nextHead = { x: head.x + delta.x, y: head.y + delta.y };

    if (
      nextHead.x < 0 ||
      nextHead.y < 0 ||
      nextHead.x >= GRID_SIZE ||
      nextHead.y >= GRID_SIZE
    ) {
      return { ...state, gameOver: true };
    }

    const bodyKeys = new Set(state.snake.map(pointKey));
    if (bodyKeys.has(pointKey(nextHead))) {
      return { ...state, gameOver: true };
    }

    const newSnake = [nextHead, ...state.snake];
    let growing = state.growing;
    let score = state.score;
    let food = state.food;
    let seed = state.seed;

    if (nextHead.x === food.x && nextHead.y === food.y) {
      growing += 2;
      score += 1;
      const foodResult = spawnFood(seed, newSnake);
      food = foodResult.food;
      seed = foodResult.seed;
    }

    if (growing > 0) {
      growing -= 1;
    } else {
      newSnake.pop();
    }

    return {
      ...state,
      snake: newSnake,
      direction,
      nextDirection: direction,
      growing,
      score,
      food,
      seed,
    };
  }

  function togglePause(state) {
    return { ...state, paused: !state.paused };
  }

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const statusEl = document.getElementById("status");
  const restartBtn = document.getElementById("restart");
  const pauseBtn = document.getElementById("pause");
  const padButtons = document.querySelectorAll(".pad-btn");

  canvas.width = GRID_SIZE * CELL_SIZE;
  canvas.height = GRID_SIZE * CELL_SIZE;

  let state = createInitialState();
  let timer = null;

  function drawGrid() {
    ctx.fillStyle = "#fdfbf6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#e6dfd0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i += 1) {
      const p = i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(canvas.width, p);
      ctx.stroke();
    }
  }

  function drawDragonHead(head, direction) {
    const centerX = head.x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = head.y * CELL_SIZE + CELL_SIZE / 2;
    const scale = CELL_SIZE * 0.42;
    let angle = 0;
    if (direction === "up") angle = -Math.PI / 2;
    if (direction === "down") angle = Math.PI / 2;
    if (direction === "left") angle = Math.PI;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    ctx.fillStyle = "#2f4f3a";
    ctx.beginPath();
    ctx.moveTo(scale, 0);
    ctx.lineTo(-scale * 0.8, -scale * 0.9);
    ctx.lineTo(-scale * 0.6, 0);
    ctx.lineTo(-scale * 0.8, scale * 0.9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#233a2c";
    ctx.beginPath();
    ctx.moveTo(-scale * 0.7, -scale * 0.95);
    ctx.lineTo(-scale * 0.4, -scale * 1.2);
    ctx.lineTo(-scale * 0.2, -scale * 0.8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-scale * 0.7, scale * 0.95);
    ctx.lineTo(-scale * 0.4, scale * 1.2);
    ctx.lineTo(-scale * 0.2, scale * 0.8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fdfbf6";
    ctx.beginPath();
    ctx.arc(-scale * 0.05, -scale * 0.2, scale * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1b1b18";
    ctx.beginPath();
    ctx.arc(0, -scale * 0.2, scale * 0.06, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawSnake() {
    ctx.fillStyle = "#2f4f3a";
    state.snake.forEach((segment, index) => {
      if (index === 0) return;
      const inset = 3;
      ctx.fillRect(
        segment.x * CELL_SIZE + inset,
        segment.y * CELL_SIZE + inset,
        CELL_SIZE - inset * 2,
        CELL_SIZE - inset * 2
      );
    });
    drawDragonHead(state.snake[0], state.direction);
  }

  function drawFood() {
    ctx.fillStyle = "#b54b3a";
    const inset = 4;
    ctx.fillRect(
      state.food.x * CELL_SIZE + inset,
      state.food.y * CELL_SIZE + inset,
      CELL_SIZE - inset * 2,
      CELL_SIZE - inset * 2
    );
  }

  function render() {
    drawGrid();
    drawFood();
    drawSnake();
    scoreEl.textContent = String(state.score);
    if (state.gameOver) {
      statusEl.textContent = "Game over. Press Restart.";
    } else if (state.paused) {
      statusEl.textContent = "Paused.";
    } else {
      statusEl.textContent = "";
    }
    pauseBtn.textContent = state.paused ? "Resume" : "Pause";
  }

  function tick() {
    state = step(state);
    render();
    if (state.gameOver) stop();
  }

  function start() {
    if (timer) return;
    timer = setInterval(tick, TICK_MS);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function restart() {
    state = createInitialState();
    render();
    stop();
    start();
  }

  function handleDirection(dir) {
    state = setDirection(state, dir);
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "arrowup" || key === "w") handleDirection("up");
    if (key === "arrowdown" || key === "s") handleDirection("down");
    if (key === "arrowleft" || key === "a") handleDirection("left");
    if (key === "arrowright" || key === "d") handleDirection("right");
    if (key === " ") {
      state = togglePause(state);
      render();
    }
  });

  padButtons.forEach((btn) => {
    btn.addEventListener("click", () => handleDirection(btn.dataset.dir));
  });

  restartBtn.addEventListener("click", restart);
  pauseBtn.addEventListener("click", () => {
    state = togglePause(state);
    render();
  });

  render();
  start();

  window.SnakeGame = {
    createInitialState,
    step,
    setDirection,
    togglePause,
    spawnFood,
  };
})();
