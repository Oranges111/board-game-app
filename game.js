// Game Configuration
const BOARD_CONFIG = {
    width: 900,
    height: 500,
    numCircles: 45, // Increased from 50 to better fill the board
    circleSize: 60, // Slightly smaller to fit more circles
    colors: ['red', 'blue', 'grey', 'orange', 'purple'],
    minDistance: 25, // Increased spacing for clearer adjacency lines
    maxConnectionDistance: 160, // Adjusted for better line visibility
    minConnections: 2 // Minimum connections per circle to ensure connectivity
};

// Preset Layouts - 5 fixed board configurations
const PRESET_LAYOUTS = {
    1: null, // Will be generated
    2: null,
    3: null,
    4: null,
    5: null
};

// Game State
let gameState = {
    pieces: {
        // Each piece tracks its position (circleId or 'inactive')
        'hero-red': 'inactive',
        'hero-blue': 'inactive',
        'hero-green': 'inactive',
        'hero-yellow': 'inactive',
        'sidekick-red': 'inactive',
        'sidekick-blue': 'inactive',
        'sidekick-green': 'inactive',
        'sidekick-yellow': 'inactive'
    },
    health: {
        // Track health for each piece
        'hero-red': 15,
        'hero-blue': 15,
        'hero-green': 15,
        'hero-yellow': 15,
        'sidekick-red': 6,
        'sidekick-blue': 6,
        'sidekick-green': 6,
        'sidekick-yellow': 6
    },
    circles: [], // Array of circle objects
    adjacencies: [], // Array of adjacency connections
    startingSpaces: [], // Array of 4 circle indices that are starting positions
    totalMoves: 0,
    currentLayout: 1 // Track which layout is active
};

// Get DOM elements
const gameBoard = document.getElementById('gameBoard');
const inactiveArea = document.getElementById('inactiveArea');
const gameStatus = document.getElementById('gameStatus');
const resetBtn = document.getElementById('resetBtn');

// Initialize the game
function initGame() {
    initializePresetLayouts();
    loadLayout(1);
    setupDragAndDrop();
    setupResetButton();
    setupLayoutSelector();
    setupHealthControls();
    updateGameStatus('Drag heroes and sidekicks to circles on the board');
}

// Initialize all 5 preset layouts
function initializePresetLayouts() {
    // Generate 5 different layouts with different random seeds
    for (let i = 1; i <= 5; i++) {
        const circles = generateCirclePositions(i * 12345); // Use different seed for each
        const adjacencies = generateAdjacencies(circles);
        const startingSpaces = selectStartingSpaces(circles, i * 12345);
        PRESET_LAYOUTS[i] = {
            circles: circles,
            adjacencies: adjacencies,
            startingSpaces: startingSpaces
        };
    }
    console.log('Initialized 5 preset layouts');
}

// Seeded random number generator
function seededRandom(seed) {
    let state = seed;
    return function() {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

// Generate random but organized circle positions
function generateCirclePositions(seed = Date.now()) {
    const rng = seededRandom(seed);
    const circles = [];
    const padding = BOARD_CONFIG.circleSize;
    const attempts = 1000;

    // Define zone centers for clustering - spread across the board more evenly
    const zoneCenters = [
        { color: 'red', x: 180, y: 120 },
        { color: 'blue', x: 180, y: 380 },
        { color: 'grey', x: 450, y: 250 },
        { color: 'orange', x: 720, y: 120 },
        { color: 'purple', x: 720, y: 380 }
    ];

    for (let i = 0; i < BOARD_CONFIG.numCircles; i++) {
        let placed = false;
        let attemptCount = 0;

        while (!placed && attemptCount < attempts) {
            // Pick a zone center with some randomness
            const targetZone = zoneCenters[Math.floor(rng() * zoneCenters.length)];

            // Generate position near the zone center with variance - larger spread for more coverage
            const spread = 200;
            const x = targetZone.x + (rng() - 0.5) * spread;
            const y = targetZone.y + (rng() - 0.5) * spread;

            const size = BOARD_CONFIG.circleSize;

            // Check bounds
            if (x - size/2 < padding || x + size/2 > BOARD_CONFIG.width - padding ||
                y - size/2 < padding || y + size/2 > BOARD_CONFIG.height - padding) {
                attemptCount++;
                continue;
            }

            // Check overlap with existing circles
            let overlaps = false;
            for (const circle of circles) {
                const dx = x - circle.x;
                const dy = y - circle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDist = size + BOARD_CONFIG.minDistance;

                if (distance < minDist) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                // Determine zones based on proximity to zone centers
                const zones = determineCircleZones(x, y, zoneCenters, rng);

                circles.push({
                    id: i,
                    x: x,
                    y: y,
                    size: size,
                    zones: zones
                });
                placed = true;
            }

            attemptCount++;
        }
    }

    return circles;
}

// Determine which zones a circle belongs to based on proximity
function determineCircleZones(x, y, zoneCenters, rng = Math.random) {
    const zoneDistances = zoneCenters.map(zone => ({
        color: zone.color,
        distance: Math.sqrt(Math.pow(x - zone.x, 2) + Math.pow(y - zone.y, 2))
    }));

    // Sort by distance
    zoneDistances.sort((a, b) => a.distance - b.distance);

    // Randomly assign 1-4 zones, weighted toward closer zones
    const numZones = Math.floor(rng() * 4) + 1; // 1 to 4 zones
    const selectedZones = [];

    // Always include the closest zone
    selectedZones.push(zoneDistances[0].color);

    // Add additional zones based on proximity and randomness
    for (let i = 1; i < numZones && i < zoneDistances.length; i++) {
        // Higher chance for closer zones
        const probability = 1 / (i + 1);
        if (rng() < probability) {
            selectedZones.push(zoneDistances[i].color);
        }
    }

    return selectedZones;
}

// Select 4 starting spaces that are well-distributed across the board
function selectStartingSpaces(circles, seed) {
    const rng = seededRandom(seed + 999); // Different seed for variety
    const startingSpaces = [];

    // Divide the board into 4 quadrants and pick one circle from each
    const quadrants = [
        { minX: 0, maxX: BOARD_CONFIG.width / 2, minY: 0, maxY: BOARD_CONFIG.height / 2 }, // Top-left
        { minX: BOARD_CONFIG.width / 2, maxX: BOARD_CONFIG.width, minY: 0, maxY: BOARD_CONFIG.height / 2 }, // Top-right
        { minX: 0, maxX: BOARD_CONFIG.width / 2, minY: BOARD_CONFIG.height / 2, maxY: BOARD_CONFIG.height }, // Bottom-left
        { minX: BOARD_CONFIG.width / 2, maxX: BOARD_CONFIG.width, minY: BOARD_CONFIG.height / 2, maxY: BOARD_CONFIG.height } // Bottom-right
    ];

    for (let i = 0; i < 4; i++) {
        const quadrant = quadrants[i];
        // Find circles in this quadrant
        const circlesInQuadrant = circles.filter(c =>
            c.x >= quadrant.minX && c.x < quadrant.maxX &&
            c.y >= quadrant.minY && c.y < quadrant.maxY
        );

        if (circlesInQuadrant.length > 0) {
            // Randomly pick one from this quadrant
            const randomIndex = Math.floor(rng() * circlesInQuadrant.length);
            const chosenCircle = circlesInQuadrant[randomIndex];
            // Find the index in the original circles array
            const circleIndex = circles.findIndex(c => c.id === chosenCircle.id);
            startingSpaces.push(circleIndex);
        }
    }

    return startingSpaces;
}

// Generate adjacency connections ensuring full connectivity
function generateAdjacencies(circles) {
    const adjacencies = [];
    const connections = new Array(circles.length).fill(0).map(() => []);

    // Build distance matrix for ALL circle pairs (no distance limit for connectivity)
    const allDistances = [];
    for (let i = 0; i < circles.length; i++) {
        for (let j = i + 1; j < circles.length; j++) {
            const dx = circles[j].x - circles[i].x;
            const dy = circles[j].y - circles[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            allDistances.push({ from: i, to: j, distance });
        }
    }

    // Sort by distance
    allDistances.sort((a, b) => a.distance - b.distance);

    // Use union-find to ensure connectivity
    const parent = Array.from({ length: circles.length }, (_, i) => i);

    function find(x) {
        if (parent[x] !== x) {
            parent[x] = find(parent[x]);
        }
        return parent[x];
    }

    function union(x, y) {
        const px = find(x);
        const py = find(y);
        if (px !== py) {
            parent[px] = py;
            return true;
        }
        return false;
    }

    // First pass: Add connections to ensure connectivity (minimum spanning tree)
    // This guarantees all circles are connected
    for (const edge of allDistances) {
        if (union(edge.from, edge.to)) {
            adjacencies.push({ from: edge.from, to: edge.to });
            connections[edge.from].push(edge.to);
            connections[edge.to].push(edge.from);
        }
    }

    // Second pass: Add more connections randomly for variety (only for nearby circles)
    const nearbyDistances = allDistances.filter(d => d.distance < BOARD_CONFIG.maxConnectionDistance);
    for (const edge of nearbyDistances) {
        // Skip if already connected
        if (connections[edge.from].includes(edge.to)) continue;

        // Add with some probability if both nodes don't have too many connections
        const maxConnections = 4; // Reduced from 5 to avoid line clutter
        if (connections[edge.from].length < maxConnections &&
            connections[edge.to].length < maxConnections &&
            Math.random() < 0.25) { // Reduced probability from 0.3 to 0.25
            adjacencies.push({ from: edge.from, to: edge.to });
            connections[edge.from].push(edge.to);
            connections[edge.to].push(edge.from);
        }
    }

    return adjacencies;
}

// Load a preset layout
function loadLayout(layoutNumber) {
    const layout = PRESET_LAYOUTS[layoutNumber];
    if (!layout) return;

    gameBoard.innerHTML = '';

    // Load circles, adjacencies, and starting spaces from preset
    gameState.circles = layout.circles;
    gameState.adjacencies = layout.adjacencies;
    gameState.startingSpaces = layout.startingSpaces;
    gameState.currentLayout = layoutNumber;

    // Draw adjacency lines first (so they appear behind circles)
    gameState.adjacencies.forEach(adj => {
        const line = createAdjacencyLine(
            gameState.circles[adj.from],
            gameState.circles[adj.to]
        );
        gameBoard.appendChild(line);
    });

    // Create circle elements
    gameState.circles.forEach((circle, index) => {
        const isStartingSpace = gameState.startingSpaces.includes(index);
        const startingNumber = isStartingSpace ? gameState.startingSpaces.indexOf(index) + 1 : null;
        const circleElement = createCircleSpace(circle, index, startingNumber);
        gameBoard.appendChild(circleElement);
    });

    console.log(`Loaded layout ${layoutNumber}: ${gameState.circles.length} circles with ${gameState.adjacencies.length} connections and ${gameState.startingSpaces.length} starting spaces`);
}

// Setup layout selector buttons
function setupLayoutSelector() {
    const layoutBtns = document.querySelectorAll('.layout-btn');
    layoutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const layoutNum = parseInt(btn.dataset.layout);

            // Update active button
            layoutBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Load the layout
            loadLayout(layoutNum);

            // Reset all pieces to inactive area
            resetPiecesToInactive();
        });
    });
}

// Reset all pieces to inactive area (used when changing layouts)
function resetPiecesToInactive() {
    const allPieces = document.querySelectorAll('.game-piece');
    allPieces.forEach(piece => {
        const currentParent = piece.parentElement;
        if (currentParent.classList.contains('circle-space')) {
            currentParent.classList.remove('occupied');
        }
        inactiveArea.appendChild(piece);
    });

    // Reset game state
    Object.keys(gameState.pieces).forEach(pieceId => {
        gameState.pieces[pieceId] = 'inactive';
    });

    updateGameStatus(`Layout ${gameState.currentLayout} loaded | Drag heroes and sidekicks to circles`);
}

// Create adjacency line that touches circle borders, not interiors
function createAdjacencyLine(circle1, circle2) {
    const line = document.createElement('div');
    line.className = 'adjacency-line';

    const dx = circle2.x - circle1.x;
    const dy = circle2.y - circle1.y;
    const angle = Math.atan2(dy, dx);

    // Calculate start and end points on circle borders
    const radius = circle1.size / 2;
    const startX = circle1.x + radius * Math.cos(angle);
    const startY = circle1.y + radius * Math.sin(angle);
    const endX = circle2.x - radius * Math.cos(angle);
    const endY = circle2.y - radius * Math.sin(angle);

    // Calculate line length between borders
    const lineDx = endX - startX;
    const lineDy = endY - startY;
    const lineLength = Math.sqrt(lineDx * lineDx + lineDy * lineDy);

    line.style.width = `${lineLength}px`;
    line.style.left = `${startX}px`;
    line.style.top = `${startY}px`;
    line.style.transform = `rotate(${angle}rad)`;

    return line;
}

// Create a circle space element
function createCircleSpace(circle, index, startingNumber = null) {
    const space = document.createElement('div');
    space.className = `circle-space zones-${circle.zones.length}`;
    space.dataset.circleId = index;

    // Position and size
    space.style.left = `${circle.x - circle.size/2}px`;
    space.style.top = `${circle.y - circle.size/2}px`;
    space.style.width = `${circle.size}px`;
    space.style.height = `${circle.size}px`;

    // Set CSS variables for zone colors
    circle.zones.forEach((color, idx) => {
        space.style.setProperty(`--zone-color-${idx + 1}`, `var(--zone-${color}, #${getZoneColorHex(color)})`);
    });

    // Create zone segments for multi-color circles
    if (circle.zones.length === 1) {
        space.classList.add(`zone-${circle.zones[0]}`);
    } else {
        circle.zones.forEach((color) => {
            const segment = document.createElement('div');
            segment.className = `zone-segment zone-${color}`;
            space.appendChild(segment);
        });
    }

    // Add starting space number if this is a starting space
    if (startingNumber !== null) {
        const numberLabel = document.createElement('div');
        numberLabel.className = 'starting-space-number';
        numberLabel.textContent = startingNumber;
        space.appendChild(numberLabel);
        space.classList.add('starting-space');
    }

    // Add drag and drop event listeners
    space.addEventListener('dragover', handleDragOver);
    space.addEventListener('dragleave', handleDragLeave);
    space.addEventListener('drop', handleDrop);

    return space;
}

// Get zone color hex value
function getZoneColorHex(color) {
    const colorMap = {
        'red': 'e74c3c',
        'blue': '3498db',
        'grey': '95a5a6',
        'orange': 'e67e22',
        'purple': '9b59b6'
    };
    return colorMap[color] || '333333';
}

// Setup drag and drop functionality
function setupDragAndDrop() {
    // Setup drag for all game pieces
    const allPieces = document.querySelectorAll('.game-piece');
    allPieces.forEach(piece => {
        piece.addEventListener('dragstart', handleDragStart);
        piece.addEventListener('dragend', handleDragEnd);
    });

    // Make inactive area droppable
    inactiveArea.addEventListener('dragover', handleDragOver);
    inactiveArea.addEventListener('dragleave', handleDragLeave);
    inactiveArea.addEventListener('drop', handleDropInactive);
}

// Drag Start
function handleDragStart(e) {
    const piece = e.currentTarget;
    piece.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', piece.dataset.pieceId);
    console.log('Drag started:', piece.dataset.pieceId);
}

// Drag End
function handleDragEnd(e) {
    const piece = e.currentTarget;
    piece.classList.remove('dragging');
    console.log('Drag ended');
}

// Drag Over
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
    return false;
}

// Drag Leave
function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

// Drop on circle
function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    e.preventDefault();

    const dropTarget = e.currentTarget;
    const circleId = parseInt(dropTarget.dataset.circleId);
    const pieceId = e.dataTransfer.getData('text/plain');

    // Remove drag-over class
    document.querySelectorAll('.circle-space, .inactive-area').forEach(el => {
        el.classList.remove('drag-over');
    });

    // Move the piece to the circle space
    movePieceToCircle(pieceId, dropTarget, circleId);

    return false;
}

// Drop on inactive area
function handleDropInactive(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    e.preventDefault();

    const pieceId = e.dataTransfer.getData('text/plain');

    // Remove drag-over class
    document.querySelectorAll('.circle-space, .inactive-area').forEach(el => {
        el.classList.remove('drag-over');
    });

    movePieceToInactive(pieceId);

    return false;
}

// Move piece to a specific circle space
function movePieceToCircle(pieceId, space, circleId) {
    const piece = document.querySelector(`[data-piece-id="${pieceId}"]`);
    if (!piece) return;

    // Remove piece from previous location
    const previousParent = piece.parentElement;
    if (previousParent.classList.contains('circle-space')) {
        // Check if there are other pieces in this circle
        const piecesInCircle = previousParent.querySelectorAll('.game-piece');
        if (piecesInCircle.length === 1) {
            previousParent.classList.remove('occupied');
        }
    }

    // Add piece to new space
    space.appendChild(piece);
    space.classList.add('occupied');

    // Update game state
    gameState.pieces[pieceId] = circleId;
    gameState.totalMoves++;

    // Get zone info for this circle
    const circle = gameState.circles[circleId];
    const zoneText = circle.zones.length === 1
        ? circle.zones[0]
        : circle.zones.join('/');

    // Get adjacent circles
    const adjacentCircles = getAdjacentCircles(circleId);

    // Count pieces on board
    const piecesOnBoard = Object.values(gameState.pieces).filter(pos => pos !== 'inactive').length;

    // Update status
    updateGameStatus(`${pieceId} → Circle ${circleId} (${zoneText}) | Pieces on board: ${piecesOnBoard} | Total moves: ${gameState.totalMoves}`);

    console.log(`${pieceId} moved to circle ${circleId}`);
    console.log('Adjacent circles:', adjacentCircles);
}

// Move piece to inactive area
function movePieceToInactive(pieceId) {
    const piece = document.querySelector(`[data-piece-id="${pieceId}"]`);
    if (!piece) return;

    // Remove piece from previous location
    const previousParent = piece.parentElement;
    if (previousParent.classList.contains('circle-space')) {
        // Check if there are other pieces in this circle
        const piecesInCircle = previousParent.querySelectorAll('.game-piece');
        if (piecesInCircle.length === 1) {
            previousParent.classList.remove('occupied');
        }
    }

    // Add piece to inactive area
    inactiveArea.appendChild(piece);

    // Update game state
    gameState.pieces[pieceId] = 'inactive';

    // Count pieces on board
    const piecesOnBoard = Object.values(gameState.pieces).filter(pos => pos !== 'inactive').length;

    // Update status
    updateGameStatus(`${pieceId} → Inactive Area | Pieces on board: ${piecesOnBoard} | Total moves: ${gameState.totalMoves}`);

    console.log(`${pieceId} moved to inactive area`);
}

// Get adjacent circles for a given circle
function getAdjacentCircles(circleId) {
    const adjacent = [];

    gameState.adjacencies.forEach(adj => {
        if (adj.from === circleId) {
            adjacent.push(adj.to);
        } else if (adj.to === circleId) {
            adjacent.push(adj.from);
        }
    });

    return adjacent;
}

// Update game status message
function updateGameStatus(message) {
    gameStatus.textContent = message;
}

// Setup reset button
function setupResetButton() {
    resetBtn.addEventListener('click', resetGame);
}

// Reset the game
function resetGame() {
    // Move all pieces back to inactive area
    const allPieces = document.querySelectorAll('.game-piece');
    allPieces.forEach(piece => {
        const currentParent = piece.parentElement;
        if (currentParent.classList.contains('circle-space')) {
            currentParent.classList.remove('occupied');
        }
        inactiveArea.appendChild(piece);
    });

    // Reset game state
    Object.keys(gameState.pieces).forEach(pieceId => {
        gameState.pieces[pieceId] = 'inactive';
    });
    gameState.totalMoves = 0;

    // Reset health
    resetAllHealth();

    // Update status
    updateGameStatus('Game reset! Drag heroes and sidekicks to circles on the board');

    console.log('Game reset');
}

// Helper functions

// Get piece position
function getPiecePosition(pieceId) {
    return gameState.pieces[pieceId];
}

// Get total moves
function getTotalMoves() {
    return gameState.totalMoves;
}

// Get pieces on a specific circle
function getPiecesOnCircle(circleId) {
    const pieces = [];
    Object.entries(gameState.pieces).forEach(([pieceId, position]) => {
        if (position === circleId) {
            pieces.push(pieceId);
        }
    });
    return pieces;
}

// Get circle at position
function getCircleAt(circleId) {
    if (circleId >= 0 && circleId < gameState.circles.length) {
        return gameState.circles[circleId];
    }
    return null;
}

// Check if a circle is in a specific zone
function isCircleInZone(circleId, zoneName) {
    const circle = getCircleAt(circleId);
    return circle ? circle.zones.includes(zoneName) : false;
}

// Setup health controls
function setupHealthControls() {
    const healthBtns = document.querySelectorAll('.health-btn');
    healthBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering other events
            const pieceId = btn.dataset.piece;
            const isIncrement = btn.classList.contains('health-up');

            if (isIncrement) {
                changeHealth(pieceId, 1);
            } else {
                changeHealth(pieceId, -1);
            }
        });
    });
}

// Change health for a piece
function changeHealth(pieceId, amount) {
    gameState.health[pieceId] += amount;

    // Don't allow negative health
    if (gameState.health[pieceId] < 0) {
        gameState.health[pieceId] = 0;
    }

    // Update the display
    updateHealthDisplay(pieceId);
}

// Update health display for a piece
function updateHealthDisplay(pieceId) {
    const healthDisplay = document.querySelector(`.health-display[data-piece="${pieceId}"]`);
    if (healthDisplay) {
        healthDisplay.textContent = gameState.health[pieceId];
    }
}

// Reset health for all pieces
function resetAllHealth() {
    // Reset heroes to 15
    gameState.health['hero-red'] = 15;
    gameState.health['hero-blue'] = 15;
    gameState.health['hero-green'] = 15;
    gameState.health['hero-yellow'] = 15;

    // Reset sidekicks to 6
    gameState.health['sidekick-red'] = 6;
    gameState.health['sidekick-blue'] = 6;
    gameState.health['sidekick-green'] = 6;
    gameState.health['sidekick-yellow'] = 6;

    // Update all displays
    Object.keys(gameState.health).forEach(pieceId => {
        updateHealthDisplay(pieceId);
    });
}

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', initGame);

console.log('Game initialized and ready to play!');
