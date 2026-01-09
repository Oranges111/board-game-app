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
        // Dynamically populated as players are added
    },
    health: {
        // Track health for each piece
        // Dynamically populated as players are added
    },
    heroes: {
        // Track which hero numbers are in use and their sidekick count
        // Format: { 1: { color: 'red', sidekicks: 2 }, ... }
    },
    availableHeroNumbers: [1, 2, 3, 4], // Available hero numbers to assign
    availableColors: ['red', 'blue', 'green', 'yellow'], // Colors to cycle through
    colorIndex: 0, // Current color index
    circles: [], // Array of circle objects
    adjacencies: [], // Array of adjacency connections
    startingSpaces: [], // Array of 4 circle indices that are starting positions
    totalMoves: 0,
    currentLayout: 1, // Track which layout is active

    // Turn management
    turnNumber: 0,
    currentPlayerIndex: 0,
    playerOrder: [], // Array of hero numbers in turn order
    actions: {
        maneuver: 0,
        attack: 0,
        scheme: 0
    },
    totalActionsSelected: 0
};

// Get DOM elements
const gameBoard = document.getElementById('gameBoard');
const inactiveArea = document.getElementById('inactiveArea');
const gameStatus = document.getElementById('gameStatus');
const resetBtn = document.getElementById('resetBtn');
const addPlayerBtn = document.getElementById('addPlayerBtn');
const healthDialsContainer = document.getElementById('healthDialsContainer');

// Turn management elements
const turnNumberDisplay = document.getElementById('turnNumber');
const activePlayerDisplay = document.getElementById('activePlayer');
const maneuverBtn = document.getElementById('maneuverBtn');
const attackBtn = document.getElementById('attackBtn');
const schemeBtn = document.getElementById('schemeBtn');
const nextTurnBtn = document.getElementById('nextTurnBtn');

// Initialize the game
function initGame() {
    initializePresetLayouts();
    loadLayout(1);
    setupResetButton();
    setupLayoutSelector();
    setupPlayerManagement();
    setupTurnManagement();
    updateGameStatus('Click "Add Player" to add heroes to the game');
}

// Initialize all 5 preset layouts
function initializePresetLayouts() {
    // Generate 5 different layouts with fixed seeds - this ensures consistency across refreshes
    for (let i = 1; i <= 5; i++) {
        const seed = i * 12345;
        const circles = generateCirclePositions(seed); // Use different seed for each
        const adjacencies = generateAdjacencies(circles, seed); // Pass seed for deterministic adjacencies
        const startingSpaces = selectStartingSpaces(circles, seed);
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
function generateAdjacencies(circles, seed = Date.now()) {
    const rng = seededRandom(seed + 999); // Add offset to seed for adjacency RNG
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

    // Second pass: Add more connections deterministically for variety (only for nearby circles)
    const nearbyDistances = allDistances.filter(d => d.distance < BOARD_CONFIG.maxConnectionDistance);
    for (const edge of nearbyDistances) {
        // Skip if already connected
        if (connections[edge.from].includes(edge.to)) continue;

        // Add with some probability if both nodes don't have too many connections
        const maxConnections = 4; // Reduced from 5 to avoid line clutter
        if (connections[edge.from].length < maxConnections &&
            connections[edge.to].length < maxConnections &&
            rng() < 0.25) { // Use seeded random instead of Math.random()
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

            // Don't reload if already on this layout
            if (layoutNum === gameState.currentLayout) return;

            // Update active button
            layoutBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Remove all game pieces from DOM
            const allPieces = document.querySelectorAll('.game-piece');
            allPieces.forEach(piece => {
                piece.remove();
            });

            // Remove all health dials from DOM
            const allDials = document.querySelectorAll('.health-dial');
            allDials.forEach(dial => {
                dial.remove();
            });

            // Reset game state completely
            gameState.pieces = {};
            gameState.health = {};
            gameState.heroes = {};
            gameState.availableHeroNumbers = [1, 2, 3, 4];
            gameState.colorIndex = 0;
            gameState.totalMoves = 0;

            // Reset turn management
            gameState.turnNumber = 0;
            gameState.currentPlayerIndex = 0;
            gameState.playerOrder = [];
            gameState.actions.maneuver = 0;
            gameState.actions.attack = 0;
            gameState.actions.scheme = 0;
            gameState.totalActionsSelected = 0;

            // Update displays
            updateTurnDisplay();
            updateActionButtons();
            updateNextTurnButton();

            // Load the new layout
            loadLayout(layoutNum);

            // Update status
            updateGameStatus('Click "Add Player" to add heroes to the game');

            console.log(`Switched to layout ${layoutNum} - all players deleted`);
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

    // Update status based on game state
    if (gameState.playerOrder.length > 0) {
        const currentHero = gameState.playerOrder[gameState.currentPlayerIndex];
        updateGameStatus(`Turn ${gameState.turnNumber} | Hero ${currentHero}'s turn - Select 2 actions`);
    } else {
        updateGameStatus('Click "Add Player" to add heroes to the game');
    }
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

// ===== PLAYER MANAGEMENT =====

// Setup player management
function setupPlayerManagement() {
    addPlayerBtn.addEventListener('click', promptAddPlayer);

    // Make inactive area droppable
    inactiveArea.addEventListener('dragover', handleDragOver);
    inactiveArea.addEventListener('dragleave', handleDragLeave);
    inactiveArea.addEventListener('drop', handleDropInactive);
}

// Prompt user to add a new player
function promptAddPlayer() {
    // Check if we have room for more heroes
    if (gameState.availableHeroNumbers.length === 0) {
        alert('Maximum of 4 heroes reached!');
        return;
    }

    // Prompt for hero health (0-40)
    const healthInput = prompt('Enter hero starting health (0-40):', '15');
    if (healthInput === null) return; // User cancelled

    const health = parseInt(healthInput);
    if (isNaN(health) || health < 0 || health > 40) {
        alert('Please enter a valid health value between 0 and 40');
        return;
    }

    // Prompt for number of sidekicks (0-4)
    const sidekicksInput = prompt('Enter number of sidekicks (0-4):', '0');
    if (sidekicksInput === null) return; // User cancelled

    const numSidekicks = parseInt(sidekicksInput);
    if (isNaN(numSidekicks) || numSidekicks < 0 || numSidekicks > 4) {
        alert('Please enter a valid number of sidekicks between 0 and 4');
        return;
    }

    // Add the player
    addPlayer(health, numSidekicks);
}

// Add a new player with specified health and sidekicks
function addPlayer(heroHealth, numSidekicks) {
    // Get the next available hero number
    const heroNum = gameState.availableHeroNumbers.shift(); // Remove from available

    // Get the next color
    const color = gameState.availableColors[gameState.colorIndex];
    gameState.colorIndex = (gameState.colorIndex + 1) % gameState.availableColors.length;

    // Store hero info
    gameState.heroes[heroNum] = {
        color: color,
        sidekicks: numSidekicks
    };

    // Create hero piece
    const heroId = `hero-${heroNum}`;
    createGamePiece(heroId, color, heroNum, 'hero', heroHealth);

    // Create sidekick pieces
    for (let i = 1; i <= numSidekicks; i++) {
        const sidekickId = `sidekick-${heroNum}-${i}`;
        const sidekickHealth = Math.max(1, Math.floor(heroHealth / 3)); // Default sidekick health
        createGamePiece(sidekickId, color, heroNum, 'sidekick', sidekickHealth, i);
    }

    // Update turn order
    updatePlayerOrder();
}

// Create a game piece (hero or sidekick)
function createGamePiece(pieceId, color, heroNum, type, health, sidekickNum = null) {
    // Create the piece element
    const piece = document.createElement('div');
    piece.className = `game-piece ${type} ${type}-${color}`;
    piece.dataset.pieceId = pieceId;
    piece.dataset.heroNum = heroNum;
    piece.draggable = true;

    // Add label
    const label = document.createElement('span');
    label.className = 'piece-label';
    if (type === 'hero') {
        label.textContent = `H${heroNum}`;
    } else {
        label.textContent = `S${heroNum}.${sidekickNum}`;
    }
    piece.appendChild(label);

    // Add to inactive area
    inactiveArea.appendChild(piece);

    // Setup drag events
    piece.addEventListener('dragstart', handleDragStart);
    piece.addEventListener('dragend', handleDragEnd);

    // Add to game state
    gameState.pieces[pieceId] = 'inactive';
    gameState.health[pieceId] = health;

    // Create health dial
    createHealthDial(pieceId, type, heroNum, sidekickNum, health, color);
}

// Create a health dial for a piece
function createHealthDial(pieceId, type, heroNum, sidekickNum, health, color) {
    const dial = document.createElement('div');
    dial.className = `health-dial dial-${color}`;
    dial.dataset.pieceId = pieceId;

    // Label
    const label = document.createElement('span');
    label.className = 'health-dial-label';
    if (type === 'hero') {
        label.textContent = `H${heroNum}`;
    } else {
        label.textContent = `S${heroNum}.${sidekickNum}`;
    }
    dial.appendChild(label);

    // Delete button (trash can)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-piece-btn';
    deleteBtn.textContent = '🗑';
    deleteBtn.dataset.pieceId = pieceId;
    deleteBtn.dataset.type = type;
    deleteBtn.dataset.heroNum = heroNum;
    deleteBtn.addEventListener('click', () => deletePiece(pieceId, type, heroNum));
    dial.appendChild(deleteBtn);

    // Health up button
    const upBtn = document.createElement('button');
    upBtn.className = 'health-btn health-up';
    upBtn.dataset.piece = pieceId;
    upBtn.textContent = '▲';
    upBtn.addEventListener('click', () => changeHealth(pieceId, 1));
    dial.appendChild(upBtn);

    // Health display
    const display = document.createElement('span');
    display.className = 'health-display';
    display.dataset.piece = pieceId;
    display.textContent = health;
    dial.appendChild(display);

    // Health down button
    const downBtn = document.createElement('button');
    downBtn.className = 'health-btn health-down';
    downBtn.dataset.piece = pieceId;
    downBtn.textContent = '▼';
    downBtn.addEventListener('click', () => changeHealth(pieceId, -1));
    dial.appendChild(downBtn);

    // Add to health panel
    healthDialsContainer.appendChild(dial);
}

// Delete a piece (hero or sidekick)
function deletePiece(pieceId, type, heroNum) {
    if (type === 'hero') {
        // Deleting a hero removes the hero and ALL its sidekicks
        const heroInfo = gameState.heroes[heroNum];
        if (!heroInfo) return;

        // Confirm deletion
        const numSidekicks = heroInfo.sidekicks;
        const confirmMsg = numSidekicks > 0
            ? `Delete Hero ${heroNum} and its ${numSidekicks} sidekick(s)?`
            : `Delete Hero ${heroNum}?`;

        if (!confirm(confirmMsg)) return;

        // Remove hero piece and dial
        removePieceAndDial(`hero-${heroNum}`);

        // Remove all sidekicks
        for (let i = 1; i <= numSidekicks; i++) {
            const sidekickId = `sidekick-${heroNum}-${i}`;
            removePieceAndDial(sidekickId);
        }

        // Remove hero from state
        delete gameState.heroes[heroNum];

        // Make hero number available again
        gameState.availableHeroNumbers.push(heroNum);
        gameState.availableHeroNumbers.sort((a, b) => a - b);

        // Update turn order
        updatePlayerOrder();

    } else {
        // Deleting a sidekick only removes that sidekick
        if (!confirm(`Delete this sidekick?`)) return;

        removePieceAndDial(pieceId);

        // Update sidekick count
        if (gameState.heroes[heroNum]) {
            gameState.heroes[heroNum].sidekicks--;
        }
    }
}

// Remove a piece from board/inactive area and its health dial
function removePieceAndDial(pieceId) {
    // Remove piece from board or inactive area
    const piece = document.querySelector(`.game-piece[data-piece-id="${pieceId}"]`);
    if (piece) {
        const parent = piece.parentElement;
        if (parent && parent.classList.contains('circle-space')) {
            // Check if this was the last piece in the circle
            const piecesInCircle = parent.querySelectorAll('.game-piece');
            if (piecesInCircle.length === 1) {
                parent.classList.remove('occupied');
            }
        }
        piece.remove();
    }

    // Remove health dial
    const dial = document.querySelector(`.health-dial[data-piece-id="${pieceId}"]`);
    if (dial) {
        dial.remove();
    }

    // Remove from state
    delete gameState.pieces[pieceId];
    delete gameState.health[pieceId];
}

// ===== TURN MANAGEMENT =====

// Setup turn management
function setupTurnManagement() {
    // Setup action button listeners
    maneuverBtn.addEventListener('click', () => selectAction('maneuver'));
    attackBtn.addEventListener('click', () => selectAction('attack'));
    schemeBtn.addEventListener('click', () => selectAction('scheme'));

    // Setup next turn button
    nextTurnBtn.addEventListener('click', nextTurn);

    // Initialize display
    updateTurnDisplay();
}

// Select an action (max 2 total actions)
function selectAction(actionType) {
    // Check if we can add more actions
    if (gameState.totalActionsSelected >= 2) {
        // If clicking an already selected action, deselect it
        if (gameState.actions[actionType] > 0) {
            gameState.actions[actionType]--;
            gameState.totalActionsSelected--;
        } else {
            return; // Can't add more actions
        }
    } else {
        // Check if this action can be selected (max 2 of same type)
        if (gameState.actions[actionType] < 2) {
            gameState.actions[actionType]++;
            gameState.totalActionsSelected++;
        }
    }

    updateActionButtons();
    updateNextTurnButton();
}

// Update action button displays
function updateActionButtons() {
    // Update maneuver button
    updateActionButton(maneuverBtn, 'maneuver');
    updateActionButton(attackBtn, 'attack');
    updateActionButton(schemeBtn, 'scheme');
}

// Update a single action button
function updateActionButton(button, actionType) {
    const count = gameState.actions[actionType];
    const countSpan = button.querySelector('.action-count');
    countSpan.textContent = count;

    // Remove all selection classes
    button.classList.remove('selected-once', 'selected-twice');

    // Add appropriate class
    if (count === 1) {
        button.classList.add('selected-once');
    } else if (count === 2) {
        button.classList.add('selected-twice');
    }

    // Disable button if 2 total actions selected and this one has 0
    if (gameState.totalActionsSelected >= 2 && count === 0) {
        button.disabled = true;
    } else {
        button.disabled = false;
    }
}

// Update next turn button state
function updateNextTurnButton() {
    // Enable only if 2 actions are selected and there are players
    if (gameState.totalActionsSelected === 2 && gameState.playerOrder.length > 0) {
        nextTurnBtn.disabled = false;
    } else {
        nextTurnBtn.disabled = true;
    }
}

// Advance to next turn
function nextTurn() {
    if (gameState.playerOrder.length === 0) return;

    // Reset actions
    gameState.actions.maneuver = 0;
    gameState.actions.attack = 0;
    gameState.actions.scheme = 0;
    gameState.totalActionsSelected = 0;

    // Move to next player
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length;

    // If back to first player, increment turn number
    if (gameState.currentPlayerIndex === 0) {
        gameState.turnNumber++;
    }

    // Update displays
    updateActionButtons();
    updateNextTurnButton();
    updateTurnDisplay();

    const currentHero = gameState.playerOrder[gameState.currentPlayerIndex];
    updateGameStatus(`Turn ${gameState.turnNumber} | Hero ${currentHero}'s turn - Select 2 actions`);
}

// Update turn display
function updateTurnDisplay() {
    if (gameState.playerOrder.length === 0) {
        turnNumberDisplay.textContent = '-';
        activePlayerDisplay.textContent = 'None';
    } else {
        turnNumberDisplay.textContent = gameState.turnNumber;
        const currentHero = gameState.playerOrder[gameState.currentPlayerIndex];
        activePlayerDisplay.textContent = `Hero ${currentHero}`;
    }
}

// Start the game (called when first player is added)
function startGame() {
    // Build player order from heroes
    gameState.playerOrder = Object.keys(gameState.heroes).map(num => parseInt(num)).sort((a, b) => a - b);
    gameState.turnNumber = 1;
    gameState.currentPlayerIndex = 0;

    // Reset actions
    gameState.actions.maneuver = 0;
    gameState.actions.attack = 0;
    gameState.actions.scheme = 0;
    gameState.totalActionsSelected = 0;

    updateTurnDisplay();
    updateActionButtons();
    updateNextTurnButton();

    const currentHero = gameState.playerOrder[gameState.currentPlayerIndex];
    updateGameStatus(`Game started! Turn ${gameState.turnNumber} | Hero ${currentHero}'s turn - Select 2 actions`);
}

// Update player order when heroes are added/removed
function updatePlayerOrder() {
    const hadPlayers = gameState.playerOrder.length > 0;
    gameState.playerOrder = Object.keys(gameState.heroes).map(num => parseInt(num)).sort((a, b) => a - b);

    if (gameState.playerOrder.length === 0) {
        // No more players
        gameState.turnNumber = 0;
        gameState.currentPlayerIndex = 0;
        updateTurnDisplay();
        updateNextTurnButton();
    } else if (!hadPlayers && gameState.playerOrder.length > 0) {
        // First player(s) added, start the game
        startGame();
    } else {
        // Adjust current player index if needed
        if (gameState.currentPlayerIndex >= gameState.playerOrder.length) {
            gameState.currentPlayerIndex = 0;
        }
        updateTurnDisplay();
        updateNextTurnButton();
    }
}

// ===== DRAG AND DROP =====

// Setup drag and drop functionality (already handled in setupPlayerManagement)
function setupDragAndDrop() {
    // This function is no longer needed as drag events are set up when pieces are created
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
    const piece = document.querySelector(`.game-piece[data-piece-id="${pieceId}"]`);
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

    console.log(`${pieceId} moved to circle ${circleId}`);
}

// Move piece to inactive area
function movePieceToInactive(pieceId) {
    const piece = document.querySelector(`.game-piece[data-piece-id="${pieceId}"]`);
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
    // Confirm deletion
    const numHeroes = Object.keys(gameState.heroes).length;
    if (numHeroes > 0) {
        if (!confirm('Reset will delete all heroes and sidekicks. Continue?')) {
            return;
        }
    }

    // Remove all game pieces from DOM
    const allPieces = document.querySelectorAll('.game-piece');
    allPieces.forEach(piece => {
        piece.remove();
    });

    // Remove all health dials from DOM
    const allDials = document.querySelectorAll('.health-dial');
    allDials.forEach(dial => {
        dial.remove();
    });

    // Reset game state
    gameState.pieces = {};
    gameState.health = {};
    gameState.heroes = {};
    gameState.availableHeroNumbers = [1, 2, 3, 4];
    gameState.colorIndex = 0;
    gameState.totalMoves = 0;

    // Reset turn management
    gameState.turnNumber = 0;
    gameState.currentPlayerIndex = 0;
    gameState.playerOrder = [];
    gameState.actions.maneuver = 0;
    gameState.actions.attack = 0;
    gameState.actions.scheme = 0;
    gameState.totalActionsSelected = 0;

    // Remove occupied class from all circles
    document.querySelectorAll('.circle-space.occupied').forEach(circle => {
        circle.classList.remove('occupied');
    });

    // Update displays
    updateTurnDisplay();
    updateActionButtons();
    updateNextTurnButton();

    // Update status
    updateGameStatus('Game reset! Click "Add Player" to add heroes to the game');

    console.log('Game reset - all players deleted');
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

// Change health for a piece
function changeHealth(pieceId, amount) {
    if (gameState.health[pieceId] === undefined) return;

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

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', initGame);

console.log('Game initialized and ready to play!');
