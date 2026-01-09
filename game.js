// Game State
let gameState = {
    pieceLocation: null, // null means outside board, or quadrant number
    moveCount: 0
};

// Get DOM elements
const gamePiece = document.getElementById('gamePiece');
const gameBoard = document.getElementById('gameBoard');
const quadrants = document.querySelectorAll('.quadrant');
const gameStatus = document.getElementById('gameStatus');
const resetBtn = document.getElementById('resetBtn');

// Initialize the game
function initGame() {
    setupDragAndDrop();
    setupResetButton();
    updateGameStatus('Drag the circle to a quadrant');
}

// Setup drag and drop functionality
function setupDragAndDrop() {
    // Drag events for the game piece
    gamePiece.addEventListener('dragstart', handleDragStart);
    gamePiece.addEventListener('dragend', handleDragEnd);

    // Drop events for each quadrant
    quadrants.forEach(quadrant => {
        quadrant.addEventListener('dragover', handleDragOver);
        quadrant.addEventListener('dragleave', handleDragLeave);
        quadrant.addEventListener('drop', handleDrop);
    });
}

// Drag Start - when user starts dragging the piece
function handleDragStart(e) {
    gamePiece.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
    
    console.log('Drag started');
}

// Drag End - when user stops dragging
function handleDragEnd(e) {
    gamePiece.classList.remove('dragging');
    console.log('Drag ended');
}

// Drag Over - when dragging over a valid drop zone
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault(); // Allows us to drop
    }
    
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
    
    return false;
}

// Drag Leave - when leaving a drop zone
function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

// Drop - when piece is dropped on a quadrant
function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation(); // Stops some browsers from redirecting
    }
    
    e.preventDefault();
    
    const dropTarget = e.currentTarget;
    const quadrantNumber = dropTarget.dataset.quadrant;
    
    // Remove drag-over class from all quadrants
    quadrants.forEach(q => q.classList.remove('drag-over'));
    
    // Move the piece to the quadrant
    movePieceToQuadrant(dropTarget, quadrantNumber);
    
    return false;
}

// Move piece to a specific quadrant
function movePieceToQuadrant(quadrant, quadrantNumber) {
    // Remove piece from previous location
    const existingPiece = gameBoard.querySelector('.game-piece');
    if (existingPiece && existingPiece.parentElement.classList.contains('quadrant')) {
        existingPiece.parentElement.classList.remove('occupied');
    }
    
    // Add piece to new quadrant
    quadrant.appendChild(gamePiece);
    quadrant.classList.add('occupied');
    
    // Update game state
    gameState.pieceLocation = parseInt(quadrantNumber);
    gameState.moveCount++;
    
    // Update status
    updateGameStatus(`Piece placed in Quadrant ${quadrantNumber} | Moves: ${gameState.moveCount}`);
    
    console.log(`Piece moved to Quadrant ${quadrantNumber}`);
    console.log('Current game state:', gameState);
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
    // Remove piece from quadrant if it's there
    const currentQuadrant = gamePiece.parentElement;
    if (currentQuadrant.classList.contains('quadrant')) {
        currentQuadrant.classList.remove('occupied');
    }
    
    // Move piece back to original position (outside board)
    const container = document.querySelector('.container');
    const gameInfo = document.querySelector('.game-info');
    container.insertBefore(gamePiece, gameInfo);
    
    // Reset game state
    gameState.pieceLocation = null;
    gameState.moveCount = 0;
    
    // Update status
    updateGameStatus('Game reset! Drag the circle to a quadrant');
    
    console.log('Game reset');
}

// Additional helper functions

// Check which quadrant the piece is in
function getCurrentQuadrant() {
    return gameState.pieceLocation;
}

// Get move count
function getMoveCount() {
    return gameState.moveCount;
}

// You can add more game logic here, such as:
// - Scoring system
// - Multiple pieces
// - Turn-based gameplay
// - Win conditions
// - Sound effects
// etc.

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', initGame);

console.log('Game initialized and ready to play!');
