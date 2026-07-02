/**
 * Python Playground demo catalog
 *
 * A curated set of self-contained Python scripts that show off the in-browser
 * Pyodide runtime (see `src/services/pythonRunner.js`). Every script relies only
 * on the preloaded `numpy` + `matplotlib` packages and prints something and/or
 * renders a figure, so it produces visible output the moment you hit "Run".
 *
 * Categories map to the showcase brief:
 *   1. neuro-viz   — neuroscience-flavoured data visualization
 *   2. experiments — science experimentation / simulation
 *   3. upload      — bring your own data (reads the injected `uploaded_data` global)
 *   4. games       — playful, self-running simulations
 *   5. generative  — bonus: generative art
 */

// Shared dark-theme preamble so figures sit nicely on the playground's dark UI.
const DARK_STYLE = `import matplotlib.pyplot as plt
plt.rcParams.update({
    'figure.facecolor': '#0b0f19', 'axes.facecolor': '#0b0f19',
    'axes.edgecolor': '#2a3342', 'grid.color': '#1c2432',
    'text.color': '#e2e8f0', 'axes.labelcolor': '#cbd5e1',
    'axes.titlecolor': '#e2e8f0', 'xtick.color': '#9aa4b2', 'ytick.color': '#9aa4b2',
})`;

export const demoCategories = [
  // ────────────────────────────────────────────────────────────────────────
  {
    id: "neuro-viz",
    title: "Neuroscience Data Viz",
    blurb: "Visualizations with a neuroscience feel — spikes, neurons, receptive fields.",
    icon: "brain",
    demos: [
      {
        id: "spike-raster",
        title: "Cortical Spike Raster",
        difficulty: "Beginner",
        tags: ["numpy", "matplotlib", "neurons"],
        description:
          "Simulate Poisson spike trains for a population of neurons and draw the classic raster plot neuroscientists use to read population activity.",
        code: `import numpy as np
${DARK_STYLE}

np.random.seed(7)
n_neurons = 25
duration = 1.0     # seconds
rate = 12          # mean firing rate (Hz)

fig, ax = plt.subplots(figsize=(8, 5))
total = 0
for i in range(n_neurons):
    # Each neuron fires as a Poisson process
    n_spikes = np.random.poisson(rate * duration)
    spike_times = np.sort(np.random.uniform(0, duration, n_spikes))
    total += n_spikes
    ax.vlines(spike_times, i + 0.6, i + 1.4, color='#00e5ff', lw=1.2)

ax.set_xlabel('Time (s)')
ax.set_ylabel('Neuron #')
ax.set_title('Cortical spike raster — 25 neurons')
ax.set_ylim(0.5, n_neurons + 0.5)
plt.tight_layout()

print(f"Simulated {n_neurons} neurons over {duration:.0f}s")
print(f"Total spikes: {total}  (~{total / n_neurons / duration:.1f} Hz per neuron)")
`,
      },
      {
        id: "lif-neuron",
        title: "Integrate-and-Fire Neuron",
        difficulty: "Intermediate",
        tags: ["simulation", "membrane potential"],
        description:
          "Model a leaky integrate-and-fire neuron: inject current, watch the membrane potential charge up, cross threshold, and spike.",
        code: `import numpy as np
${DARK_STYLE}

# Leaky integrate-and-fire parameters
tau_m   = 20.0    # membrane time constant (ms)
V_rest  = -65.0   # resting potential (mV)
V_th    = -50.0   # spike threshold (mV)
V_reset = -70.0   # reset potential (mV)
R       = 10.0    # membrane resistance (MOhm)
I       = 2.0     # injected current (nA)

dt, T = 0.1, 200.0
steps = int(T / dt)
t = np.arange(steps) * dt
V = np.full(steps, V_rest)
spikes = []

for k in range(1, steps):
    dV = (-(V[k - 1] - V_rest) + R * I) / tau_m
    V[k] = V[k - 1] + dV * dt
    if V[k] >= V_th:          # threshold crossing -> spike
        V[k] = V_reset
        spikes.append(t[k])

fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(t, V, color='#ff2d95', lw=1.6)
for s in spikes:                       # draw spikes as upstrokes
    ax.plot([s, s], [V_th, -30], color='#00e5ff', lw=1.2)
ax.axhline(V_th, ls='--', color='#f59e0b', alpha=0.8, label='threshold')
ax.set_xlabel('Time (ms)'); ax.set_ylabel('Membrane potential (mV)')
ax.set_title('Leaky integrate-and-fire neuron')
ax.legend(loc='upper right', facecolor='#0b0f19', edgecolor='#2a3342')
plt.tight_layout()

rate = len(spikes) / (T / 1000.0)
print(f"Neuron fired {len(spikes)} spikes -> {rate:.1f} Hz")
`,
      },
      {
        id: "receptive-field",
        title: "Retinal Receptive Field",
        difficulty: "Intermediate",
        tags: ["retina", "vision", "heatmap"],
        description:
          "Build an ON-center / OFF-surround retinal ganglion receptive field as a Difference-of-Gaussians — the 'Mexican hat' that lets your retina detect edges.",
        code: `import numpy as np
${DARK_STYLE}

size = 200
x = np.linspace(-4, 4, size)
X, Y = np.meshgrid(x, x)
r2 = X**2 + Y**2

center   = np.exp(-r2 / 0.5)        # excitatory center
surround = 0.6 * np.exp(-r2 / 3.0)  # inhibitory surround
dog = center - surround             # ON-center receptive field

fig, axes = plt.subplots(1, 2, figsize=(9, 4))
im = axes[0].imshow(dog, cmap='RdBu_r', extent=[-4, 4, -4, 4])
axes[0].set_title('ON-center receptive field')
axes[0].set_xlabel('deg'); axes[0].set_ylabel('deg')
fig.colorbar(im, ax=axes[0], fraction=0.046)

axes[1].plot(x, dog[size // 2], color='#ff2d95', lw=1.8)
axes[1].axhline(0, color='#4b5563', lw=0.8)
axes[1].set_title('Cross-section ("Mexican hat")')
axes[1].set_xlabel('deg'); axes[1].set_ylabel('response')
plt.tight_layout()

print("Peak center response:", round(float(dog.max()), 3))
print("Trough (surround):   ", round(float(dog.min()), 3))
`,
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    id: "experiments",
    title: "Science Experiments",
    blurb: "Run a simulated experiment and watch the numbers come alive.",
    icon: "flask",
    demos: [
      {
        id: "predator-prey",
        title: "Predator & Prey",
        difficulty: "Intermediate",
        tags: ["ecology", "ODE", "dynamics"],
        description:
          "The Lotka-Volterra equations: foxes eat rabbits, rabbits breed, and the two populations chase each other in endless cycles.",
        code: `import numpy as np
${DARK_STYLE}

# Lotka-Volterra predator-prey model
alpha, beta   = 1.0, 0.1   # prey growth, predation rate
delta, gamma  = 0.075, 1.5 # predator growth from prey, predator death

dt, T = 0.01, 60.0
steps = int(T / dt)
prey = np.zeros(steps); pred = np.zeros(steps)
prey[0], pred[0] = 40, 9

for k in range(1, steps):
    dp = (alpha * prey[k-1] - beta * prey[k-1] * pred[k-1]) * dt
    dq = (delta * prey[k-1] * pred[k-1] - gamma * pred[k-1]) * dt
    prey[k] = prey[k-1] + dp
    pred[k] = pred[k-1] + dq

t = np.arange(steps) * dt
fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(t, prey, color='#22d3ee', lw=1.8, label='Rabbits (prey)')
ax.plot(t, pred, color='#ff2d95', lw=1.8, label='Foxes (predator)')
ax.set_xlabel('Time'); ax.set_ylabel('Population')
ax.set_title('Lotka-Volterra predator-prey cycles')
ax.legend(facecolor='#0b0f19', edgecolor='#2a3342')
plt.tight_layout()

print(f"Peak rabbit population: {prey.max():.0f}")
print(f"Peak fox population:    {pred.max():.0f}")
`,
      },
      {
        id: "monte-carlo-pi",
        title: "Estimate π with Randomness",
        difficulty: "Beginner",
        tags: ["monte carlo", "probability"],
        description:
          "Throw thousands of random darts at a square and count how many land inside the circle. The ratio estimates π — a Monte Carlo experiment you can watch converge.",
        code: `import numpy as np
${DARK_STYLE}

np.random.seed(1)
n = 8000
x = np.random.rand(n); y = np.random.rand(n)
inside = x**2 + y**2 <= 1.0

pi_estimate = 4 * inside.mean()
running = 4 * np.cumsum(inside) / np.arange(1, n + 1)

fig, axes = plt.subplots(1, 2, figsize=(9, 4))
axes[0].scatter(x[inside], y[inside], s=3, color='#22d3ee', label='inside')
axes[0].scatter(x[~inside], y[~inside], s=3, color='#ff2d95', label='outside')
axes[0].set_aspect('equal'); axes[0].set_title(f'{n} random darts')
axes[0].legend(markerscale=3, facecolor='#0b0f19', edgecolor='#2a3342')

axes[1].plot(running, color='#a78bfa', lw=1.2)
axes[1].axhline(np.pi, ls='--', color='#f59e0b', label='true π')
axes[1].set_title('Estimate converging'); axes[1].set_xlabel('samples')
axes[1].legend(facecolor='#0b0f19', edgecolor='#2a3342')
plt.tight_layout()

print(f"Estimated π = {pi_estimate:.4f}")
print(f"True      π = {np.pi:.4f}")
print(f"Error       = {abs(pi_estimate - np.pi):.4f}")
`,
      },
      {
        id: "diffusion",
        title: "Diffusion & Brownian Motion",
        difficulty: "Beginner",
        tags: ["random walk", "physics"],
        description:
          "Release particles from a single point and let them random-walk. This is how neurotransmitters spread across a synapse — diffusion, one tiny step at a time.",
        code: `import numpy as np
${DARK_STYLE}

np.random.seed(3)
n_particles, n_steps = 400, 500
# Each step is a random unit move in x and y
steps = np.random.normal(0, 1, (n_particles, n_steps, 2))
paths = np.cumsum(steps, axis=1)

fig, axes = plt.subplots(1, 2, figsize=(9, 4))
for i in range(0, n_particles, 12):        # sample a few trajectories
    axes[0].plot(paths[i, :, 0], paths[i, :, 1], lw=0.6, alpha=0.7)
axes[0].scatter([0], [0], color='#f59e0b', s=40, zorder=5, label='start')
axes[0].set_title('Random-walk trajectories'); axes[0].legend(
    facecolor='#0b0f19', edgecolor='#2a3342')

final = paths[:, -1, :]
dist = np.hypot(final[:, 0], final[:, 1])
axes[1].hist(dist, bins=25, color='#22d3ee', edgecolor='#0b0f19')
axes[1].set_title('Distance from origin'); axes[1].set_xlabel('distance')
plt.tight_layout()

print(f"Mean displacement after {n_steps} steps: {dist.mean():.1f}")
print(f"Theory  sqrt(2 * steps):                {np.sqrt(2 * n_steps):.1f}")
`,
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    id: "upload",
    title: "Upload Your Own Data",
    blurb: "Drop in a CSV and let Python summarize and chart it live.",
    icon: "upload",
    demos: [
      {
        id: "csv-explorer",
        title: "CSV Explorer",
        difficulty: "Beginner",
        requiresUpload: true,
        tags: ["csv", "stats", "your data"],
        description:
          "Upload any CSV using the panel above the editor. Python parses it, reports summary statistics for every numeric column, and charts the first two. No upload? It runs on a bundled sample signal.",
        code: `import numpy as np
import io, csv
${DARK_STYLE}

# 'uploaded_data' is injected when you upload a CSV in the panel above.
# With no upload we fall back to a bundled EEG-like sample signal.
try:
    raw = uploaded_data
except NameError:
    raw = None

if not raw or not raw.strip():
    rng = np.random.RandomState(0)
    sig = np.sin(np.linspace(0, 20, 200)) + rng.normal(0, 0.3, 200)
    raw = "index,signal\\n" + "\\n".join(f"{i},{v:.4f}" for i, v in enumerate(sig))
    print("No file uploaded — using bundled sample data.\\n")

rows = [r for r in csv.reader(io.StringIO(raw)) if r]
header, body = rows[0], rows[1:]

# Find numeric columns
numeric = {}
for c, name in enumerate(header):
    vals = []
    for r in body:
        if c < len(r):
            try:
                vals.append(float(r[c]))
            except ValueError:
                pass
    if len(vals) >= max(2, 0.5 * len(body)):
        numeric[name] = np.array(vals)

print(f"Rows: {len(body)}   Columns: {len(header)}   Numeric: {len(numeric)}")
print("-" * 44)
for name, vals in numeric.items():
    print(f"{name:>14}: mean={vals.mean():8.3f}  std={vals.std():7.3f}  "
          f"min={vals.min():7.2f}  max={vals.max():7.2f}")

cols = list(numeric.items())
if cols:
    fig, axes = plt.subplots(1, 2, figsize=(9, 4))
    name0, v0 = cols[0]
    axes[0].plot(v0, color='#22d3ee', lw=1.2)
    axes[0].set_title(f'{name0} (line)')
    if len(cols) >= 2:
        name1, v1 = cols[1]
        m = min(len(v0), len(v1))
        axes[1].scatter(v0[:m], v1[:m], s=8, color='#ff2d95', alpha=0.6)
        axes[1].set_xlabel(name0); axes[1].set_ylabel(name1)
        axes[1].set_title(f'{name0} vs {name1}')
    else:
        axes[1].hist(v0, bins=20, color='#a78bfa', edgecolor='#0b0f19')
        axes[1].set_title(f'{name0} (distribution)')
    plt.tight_layout()
else:
    print("\\nNo numeric columns found to plot.")
`,
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    id: "games",
    title: "Fun & Games",
    blurb: "Self-running games and simulations — sit back and watch the code play.",
    icon: "gamepad",
    demos: [
      {
        id: "snake-ai",
        title: "Self-Playing Snake",
        difficulty: "Intermediate",
        tags: ["game", "AI", "grid"],
        description:
          "A greedy Snake bot hunts apples on a 20×20 grid, steering toward food while dodging its own tail. Run it and see the final board and score.",
        code: `import numpy as np
from collections import deque
${DARK_STYLE}

W = H = 20
rng = np.random.RandomState(3)

def new_food(occupied):
    while True:
        f = (int(rng.randint(0, W)), int(rng.randint(0, H)))
        if f not in occupied:
            return f

snake = deque([(10, 10)])
occupied = set(snake)
food = new_food(occupied)
score, steps, alive = 0, 0, True

for steps in range(1, 1001):
    head = snake[-1]
    # Greedy: pick the legal move that gets closest to the food
    best = None
    for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
        nx, ny = head[0] + dx, head[1] + dy
        if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in occupied:
            d = abs(nx - food[0]) + abs(ny - food[1])
            if best is None or d < best[0]:
                best = (d, (nx, ny))
    if best is None:            # boxed in — game over
        alive = False
        break
    nxt = best[1]
    snake.append(nxt); occupied.add(nxt)
    if nxt == food:
        score += 1
        food = new_food(occupied)
    else:
        tail = snake.popleft(); occupied.discard(tail)

# Render the final board
grid = np.zeros((H, W))
for (x, y) in snake:
    grid[y, x] = 1            # body
grid[snake[-1][1], snake[-1][0]] = 2   # head
grid[food[1], food[0]] = 3             # apple

from matplotlib.colors import ListedColormap
cmap = ListedColormap(['#0b0f19', '#22d3ee', '#a7f3d0', '#ff2d95'])
fig, ax = plt.subplots(figsize=(6, 6))
ax.imshow(grid, cmap=cmap, vmin=0, vmax=3)
ax.set_xticks([]); ax.set_yticks([])
ax.set_title(f'Snake AI — score {score}')
plt.tight_layout()

print(f"Score: {score} apples in {steps} steps")
print("Result:", "still slithering" if alive else "boxed itself in!")
`,
      },
      {
        id: "game-of-life",
        title: "Conway's Game of Life",
        difficulty: "Intermediate",
        tags: ["cellular automata", "emergence"],
        description:
          "The most famous cellular automaton: four simple rules give rise to gliders, blinkers and chaos. Watch a random soup evolve across six snapshots.",
        code: `import numpy as np
${DARK_STYLE}

rng = np.random.RandomState(42)
N = 60
grid = (rng.rand(N, N) < 0.25).astype(np.uint8)

def step(g):
    # Count 8-neighbours with wrap-around
    nb = sum(np.roll(np.roll(g, i, 0), j, 1)
             for i in (-1, 0, 1) for j in (-1, 0, 1)
             if (i, j) != (0, 0))
    return ((nb == 3) | ((g == 1) & (nb == 2))).astype(np.uint8)

snapshots = [0, 5, 10, 20, 40, 80]
frames, g = {}, grid.copy()
for gen in range(max(snapshots) + 1):
    if gen in snapshots:
        frames[gen] = g.copy()
    g = step(g)

fig, axes = plt.subplots(2, 3, figsize=(9, 6))
for ax, gen in zip(axes.ravel(), snapshots):
    ax.imshow(frames[gen], cmap='magma', vmin=0, vmax=1)
    ax.set_title(f'gen {gen}  ·  {int(frames[gen].sum())} alive', fontsize=9)
    ax.set_xticks([]); ax.set_yticks([])
plt.tight_layout()

print("Generation :  living cells")
for gen in snapshots:
    print(f"   {gen:>3}     :  {int(frames[gen].sum())}")
`,
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    id: "generative",
    title: "Generative Art",
    blurb: "Math that turns into pictures — fractals and infinite zoom.",
    icon: "sparkle",
    demos: [
      {
        id: "mandelbrot",
        title: "The Mandelbrot Set",
        difficulty: "Intermediate",
        tags: ["fractal", "complex numbers"],
        description:
          "One line of complex arithmetic, iterated — and out falls the most famous fractal in mathematics, infinitely detailed at every zoom level.",
        code: `import numpy as np
${DARK_STYLE}

w, h = 700, 500
x = np.linspace(-2.2, 0.8, w)
y = np.linspace(-1.2, 1.2, h)
C = x[None, :] + 1j * y[:, None]
Z = np.zeros_like(C)
escape = np.zeros(C.shape, dtype=int)

for i in range(80):
    mask = np.abs(Z) <= 2
    Z[mask] = Z[mask] ** 2 + C[mask]
    escape[mask] = i

fig, ax = plt.subplots(figsize=(8, 5.5))
ax.imshow(escape, cmap='magma', extent=[-2.2, 0.8, -1.2, 1.2])
ax.set_title('The Mandelbrot set'); ax.set_xlabel('Re'); ax.set_ylabel('Im')
plt.tight_layout()

inside = (escape == 79).mean()
print(f"Grid: {w}x{h} = {w*h:,} points, 80 iterations")
print(f"~{inside*100:.1f}% of the frame lies inside the set")
`,
      },
      {
        id: "fractal-tree",
        title: "Recursive Fractal Tree",
        difficulty: "Beginner",
        tags: ["recursion", "L-system"],
        description:
          "A branch splits into two smaller branches, which split again, and again. A handful of recursive lines grow a whole tree — the same branching math as dendrites and blood vessels.",
        code: `import numpy as np
${DARK_STYLE}

fig, ax = plt.subplots(figsize=(7, 7))

def branch(x, y, angle, length, depth):
    if depth == 0 or length < 1:
        return
    x2 = x + length * np.cos(angle)
    y2 = y + length * np.sin(angle)
    shade = plt.cm.viridis(depth / 10)
    ax.plot([x, x2], [y, y2], color=shade, lw=depth * 0.4)
    spread = np.radians(22)
    branch(x2, y2, angle - spread, length * 0.75, depth - 1)
    branch(x2, y2, angle + spread, length * 0.75, depth - 1)

branch(0, 0, np.radians(90), 120, 10)
ax.set_aspect('equal'); ax.axis('off')
ax.set_title('Recursive fractal tree (depth 10)')
plt.tight_layout()

print("Grew a tree from 1 trunk -> 2^10 = 1024 leaf branches")
`,
      },
    ],
  },
];

// Flat lookup helper used by the view.
export const allDemos = demoCategories.flatMap((c) =>
  c.demos.map((d) => ({ ...d, categoryId: c.id }))
);
