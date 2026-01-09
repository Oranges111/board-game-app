# Unmatched Board Game - Digital Implementation

A web-based digital implementation of the Unmatched board game with drag-and-drop gameplay, turn management, and dynamic player creation.

## Features

### Board System
- **5 Preset Board Layouts**: Switch between 5 unique, pre-generated board configurations
- **Consistent Layouts**: Board layouts are deterministic - each board (1-5) will always have the same circle positions and adjacency lines across refreshes
- **45 Circles per Board**: Each board has 45 spaces organized into 5 color-coded zones (red, blue, grey, orange, purple)
- **Adjacency Connections**: Spaces are connected with visible lines showing valid movement paths
- **4 Starting Spaces**: Each board has 4 numbered starting positions (1-4) marked with small white circles

### Player Management
- **Dynamic Player Creation**: Add up to 4 heroes with customizable health (0-40) and sidekicks (0-4)
- **No Default Players**: Game starts with an empty board - players are added on demand
- **Color-Coded Heroes**: Each hero is assigned a unique color (red, blue, green, or yellow)
- **Hero Number Reuse**: When heroes are deleted, their numbers become available again (e.g., delete H1 → next hero added becomes H1)
- **Sidekick Management**: Each hero can have 0-4 sidekicks, with health automatically set to 1/3 of hero health
- **Delete Functionality**:
  - Deleting a hero removes the hero AND all its sidekicks
  - Deleting a sidekick removes only that specific sidekick
  - Confirmation prompts before deletion

### Turn-Based Gameplay
- **Turn Tracking**: Displays current turn number and active player
- **Player Order**: Turns cycle through all heroes in numerical order (H1 → H2 → H3 → H4 → back to H1)
- **2 Actions per Turn**: Each player selects exactly 2 actions before ending their turn
- **3 Action Types**:
  - **Maneuver**: Movement action
  - **Attack**: Attack action
  - **Scheme**: Scheme action
- **Flexible Action Selection**: Any combination allowed (attack twice, maneuver + scheme, etc.)
- **Visual Feedback**:
  - Selected once: Purple gradient
  - Selected twice: Red gradient
  - Action count displayed on each button
- **Next Turn Button**: Only enabled after selecting 2 actions

### Health Management
- **Color-Coded Health Dials**: Each piece's health dial matches its token color with gradient backgrounds
  - Red fighters: Red-tinted dial
  - Blue fighters: Blue-tinted dial
  - Green fighters: Green-tinted dial
  - Yellow fighters: Yellow-tinted dial
- **Health Adjustment**: Increase/decrease health with ▲/▼ buttons
- **Health Range**: 0-40 health points per piece
- **Health Display**: Real-time health updates visible in the right panel

### Drag-and-Drop Gameplay
- **Piece Movement**: Drag heroes and sidekicks from the inactive area to board spaces
- **Multiple Pieces per Space**: Spaces can hold multiple pieces simultaneously
- **Visual Feedback**:
  - Hover effects on spaces
  - Drag-over highlighting
  - Occupied spaces get a border
- **Return to Inactive**: Drag pieces back to the inactive area

### UI Layout
- **Top Left**: Turn Manager with turn number, active player, action selection, and Next Turn button
- **Top Right**: Health Panel with color-coded health dials for all pieces
- **Bottom Left**: Board Layout selector (buttons 1-5)
- **Center**: Game board with drag-and-drop functionality
- **Below Board**: Inactive Area for pieces not yet on the board

### Board Switching
- **Complete Reset**: Switching boards deletes all players and resets the game
- **No Reload on Same Board**: Clicking the active board button does nothing
- **Clean Transition**: All pieces, health dials, and turn state are cleared

## File Structure

```
my-board-game/
├── index.html          # Main HTML structure
├── styles.css          # All styling and visual design
├── game.js            # Game logic, state management, and interactions
└── README.md          # This file
```

## How to Use

### Starting a Game
1. Open `index.html` in a web browser
2. Click "Add Player" button
3. Enter hero health (0-40) and number of sidekicks (0-4)
4. Repeat for up to 4 heroes total
5. Drag pieces from the Inactive Area to starting spaces (marked 1-4)

### Playing a Turn
1. Active player is shown in the Turn Manager (top left)
2. Select 2 actions by clicking action buttons (Maneuver/Attack/Scheme)
3. Actions can be selected in any combination
4. Visual feedback shows how many times each action is selected
5. Click "Next Turn" when 2 actions are selected
6. Turn automatically advances to the next player

### Managing Health
1. Health dials are color-coded to match fighter colors (right panel)
2. Click ▲ to increase health, ▼ to decrease health
3. Health cannot go below 0
4. Click 🗑 (trash icon) to delete a piece

### Switching Boards
1. Click any board button (1-5) in the bottom left
2. All players will be deleted (fresh start)
3. Board layout changes with new circle positions and connections
4. Add new players to start playing on the new board

### Resetting
- Click "Reset Game" button to delete all heroes and start over
- Switching boards also acts as a reset

## Technical Details

### Board Generation
- **Seeded Random Generation**: Each board uses a fixed seed (12345, 24690, 37035, 49380, 61725)
- **Deterministic Adjacencies**: Adjacency lines are calculated using seeded randomness for consistency
- **Zone-Based Clustering**: Circles are organized into 5 color-coded zones for strategic gameplay
- **Starting Space Selection**: 4 starting spaces automatically selected, one per quadrant

### Game State Management
- All game state is stored in a single `gameState` object
- Pieces tracked by unique IDs (hero-1, sidekick-2-3, etc.)
- Health values stored separately for each piece
- Turn order maintained as sorted array of hero numbers

### Color System
- **Hero Colors**: red, blue, green, yellow (cycles for multiple heroes)
- **Zone Colors**: red, blue, grey, orange, purple (fixed for board zones)
- **Health Dial Colors**: Match hero colors with gradient backgrounds and colored borders

## Browser Compatibility

Works in all modern browsers that support:
- HTML5 Drag and Drop API
- CSS Grid and Flexbox
- ES6 JavaScript

## Future Enhancements (Potential)

- Save/load game state
- Movement validation based on adjacency
- Attack range calculations
- Card deck management
- Multiplayer online support
- Mobile touch support
- Sound effects
- Animation improvements

## Version History

### Current Version
- 5 preset deterministic board layouts
- Dynamic player creation (0-4 heroes, 0-4 sidekicks each)
- Turn-based action selection system
- Color-coded health management
- Board switching with complete reset
- Drag-and-drop piece movement
- Hero/sidekick deletion with number reuse

---

**Game Type**: Strategic Board Game
**Players**: 1-4
**Implementation**: Pure HTML/CSS/JavaScript (no frameworks)
**Status**: Fully Functional Core Gameplay
