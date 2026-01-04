import Phaser from 'phaser';
import type { GameConfig } from '../ui/ConfigPanel';
import { Leaderboard } from './Leaderboard';
import { GridVerifier } from './GridVerifier';

interface Cell {
  row: number;
  col: number;
  ball?: Phaser.GameObjects.Arc;
  color?: number;
}

export class GameScene extends Phaser.Scene {
  private board: Cell[][] = [];
  private selectedCell: Cell | null = null;
  private nextBalls: number[] = [];
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private nextBallsPreview: Phaser.GameObjects.Container[] = [];
  private gameOver: boolean = false;
  private boardOffsetX: number = 0;
  private boardOffsetY: number = 0;
  private cellSize: number = 40;
  private gridRectangles: Phaser.GameObjects.Rectangle[] = [];
  private leaderboard: Leaderboard;
  private leaderboardText!: Phaser.GameObjects.Text;
  private gridVerifier: GridVerifier;
  private config: GameConfig = {
    colors: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500],
    minLineLength: 5,
    boardSize: 9,
    ballsPerRound: 3
  };
  private configPanelWidth: number = 250;

  constructor() {
    super({ key: 'GameScene' });
    this.leaderboard = new Leaderboard();
    this.gridVerifier = new GridVerifier({
      minLineLength: this.config.minLineLength,
      boardSize: this.config.boardSize
    });
  }

  create() {
    // Improve rendering quality on high DPI displays
    const renderer = this.game.renderer;
    if (renderer && 'gl' in renderer && renderer.gl) {
      const gl = renderer.gl;
      // Enable better texture filtering
      gl.enable(gl.BLEND);
      // Set texture parameters for better quality
      const texture = gl.getParameter(gl.TEXTURE_BINDING_2D);
      if (texture) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }
    }

    // Listen for config changes
    window.addEventListener('config-changed', ((e: CustomEvent<GameConfig>) => {
      this.updateConfig(e.detail);
    }) as EventListener);

    // Listen for game reset
    window.addEventListener('reset-game', () => {
      this.resetGame();
    });

    // Listen for config panel resize (collapse/expand or rotation)
    window.addEventListener('config-panel-resize', ((e: CustomEvent<{ width: number }>) => {
      this.configPanelWidth = e.detail.width;
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        this.recalculateBoardPosition();
      });
    }) as EventListener);

    // Listen for window resize/orientation change
    window.addEventListener('resize', () => {
      this.handleResize();
    });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.handleResize(), 100);
    });

    this.initializeGame();
  }

  private handleResize() {
    // Recalculate board position on resize/orientation change
    this.recalculateBoardPosition();
  }

  private getSafeAreaTop(): number {
    // Get safe area inset for notch/Dynamic Island
    // CSS env() variables can't be directly read in JS, so we estimate based on device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // Check if we're in standalone mode (PWA)
      const isStandalone = (window.navigator as any).standalone || 
                          window.matchMedia('(display-mode: standalone)').matches;
      
      if (isStandalone) {
        // In PWA mode, safe area is typically:
        // iPhone X/11/12: ~44px
        // iPhone 13/14: ~47px  
        // iPhone 15 Pro: ~59px (Dynamic Island)
        // Use a conservative estimate that works for most devices
        const screenHeight = window.screen.height;
        const screenWidth = window.screen.width;
        const isLandscape = screenWidth > screenHeight;
        
        // iPhone 15 Pro has Dynamic Island, taller safe area
        if (screenHeight >= 852 && screenWidth >= 393) {
          // Likely iPhone 15 Pro or similar
          return isLandscape ? 0 : 59;
        } else if (screenHeight >= 844) {
          // iPhone 12/13/14 series
          return isLandscape ? 0 : 47;
        } else {
          // Older iPhones with notch
          return isLandscape ? 0 : 44;
        }
      }
      // In browser mode, safe area is usually 0 or minimal
      return 0;
    }
    return 0;
  }

  private recalculateBoardPosition() {
    const boardSize = this.config.boardSize;
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;
    
    // Ensure configPanelWidth is valid (at least 0)
    const panelWidth = Math.max(0, this.configPanelWidth);
    const availableWidth = screenWidth - panelWidth;
    
    // On mobile, make grid wider and position closer to top to leave space for leaderboard
    const isMobileDevice = window.innerWidth <= 768;
    const leaderboardSpace = isMobileDevice ? 120 : 0; // Space reserved for leaderboard on mobile
    
    // Adjust available height for leaderboard on mobile
    const availableHeight = screenHeight - leaderboardSpace;
    const maxCellSize = Math.min(availableWidth, availableHeight) / (boardSize + (isMobileDevice ? 1.5 : 2));
    this.cellSize = Math.max(25, Math.min(50, maxCellSize));
    
    // Recalculate board position - on mobile, position at top below controls
    this.boardOffsetX = panelWidth + (availableWidth - boardSize * this.cellSize) / 2;
    if (isMobileDevice) {
      // Position at top on mobile, below score text and next balls preview
      // Score text: safeAreaTop + 20, fontSize 24px -> bottom at ~safeAreaTop + 44
      // Next balls: safeAreaTop + 15 (center), radius 15 -> bottom at ~safeAreaTop + 30
      // Position grid below both with some spacing
      const safeAreaTop = this.getSafeAreaTop();
      this.boardOffsetY = safeAreaTop + 70; // Below score (44px) and next balls (30px) with spacing
    } else {
      // Center vertically on desktop
      this.boardOffsetY = (screenHeight - boardSize * this.cellSize) / 2 - 50;
    }

    // Update grid background rectangles
    let rectIndex = 0;
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const x = this.boardOffsetX + col * this.cellSize + this.cellSize / 2;
        const y = this.boardOffsetY + row * this.cellSize + this.cellSize / 2;
        
        if (rectIndex < this.gridRectangles.length) {
          const rect = this.gridRectangles[rectIndex];
          rect.setPosition(x, y);
          rect.setSize(this.cellSize - 2, this.cellSize - 2);
        }
        rectIndex++;
      }
    }

    // Update all ball positions - ensure we iterate through all cells
    if (this.board && this.board.length > 0) {
      for (let row = 0; row < boardSize && row < this.board.length; row++) {
        for (let col = 0; col < boardSize && col < (this.board[row]?.length || 0); col++) {
          const cell = this.board[row]?.[col];
          if (cell?.ball) {
            const x = this.boardOffsetX + cell.col * this.cellSize + this.cellSize / 2;
            const y = this.boardOffsetY + cell.row * this.cellSize + this.cellSize / 2;
            // Use setPosition to update both x and y at once
            cell.ball.setPosition(x, y);
            cell.ball.setRadius(this.cellSize / 2 - 4);
          }
        }
      }
    }

    // Update score text position - round to avoid subpixel blur
    // Position after toggle button to avoid overlap, with 20px padding from top
    if (this.scoreText) {
      const windowWidth = window.innerWidth;
      const isMobileScreen = windowWidth <= 768;
      const isSmallMobileScreen = windowWidth <= 480;
      const toggleButtonWidth = isSmallMobileScreen ? 30 : isMobileScreen ? 35 : 40;
      const scoreX = Math.max(panelWidth, toggleButtonWidth) + 10;
      // Account for safe area (notch) + 20px padding
      const safeAreaTop = this.getSafeAreaTop();
      const scoreY = safeAreaTop;
      this.scoreText.setX(Math.round(scoreX));
      this.scoreText.setY(Math.round(scoreY));
    }

    // Update preview position
    this.updateNextBallsPreview();

    // Update leaderboard position
    this.updateLeaderboardDisplay();
  }

  private initializeGame() {
    // Clear existing board
    this.children.removeAll();
    this.gridRectangles = [];
    this.gameOver = false;
    this.score = 0;
    this.selectedCell = null;
    this.nextBallsPreview = [];
    
    // Remove any existing game over popup
    const existingPopup = document.getElementById('game-over-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Check if panel is collapsed from localStorage
    let isCollapsed = false;
    try {
      const stored = localStorage.getItem('colorLinesGameConfigCollapsed');
      if (stored !== null) {
        isCollapsed = JSON.parse(stored) === true;
      }
    } catch (error) {
      // Ignore errors, use default
    }

    // Update panel width based on screen size and collapsed state
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;
    const baseWidth = isSmallMobile ? 160 : isMobile ? 200 : 250;
    this.configPanelWidth = isCollapsed ? 0 : baseWidth;

    const boardSize = this.config.boardSize;

    // Calculate responsive cell size
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;
    const availableWidth = screenWidth - this.configPanelWidth;
    
    // On mobile, make grid wider and position closer to top to leave space for leaderboard
    const isMobileDevice = window.innerWidth <= 768;
    const leaderboardSpace = isMobile ? 120 : 0; // Space reserved for leaderboard on mobile
    
    // Adjust available height for leaderboard on mobile
    const availableHeight = screenHeight - leaderboardSpace;
    const maxCellSize = Math.min(availableWidth, availableHeight) / (boardSize + (isMobileDevice ? 1.5 : 2));
    this.cellSize = Math.max(25, Math.min(50, maxCellSize));
    
    // Calculate board position - on mobile, position at top below controls
    this.boardOffsetX = this.configPanelWidth + (availableWidth - boardSize * this.cellSize) / 2;
    if (isMobileDevice) {
      // Position at top on mobile, below score text and next balls preview
      // Score text: safeAreaTop + 20, fontSize 24px -> bottom at ~safeAreaTop + 44
      // Next balls: safeAreaTop + 15 (center), radius 15 -> bottom at ~safeAreaTop + 30
      // Position grid below both with some spacing
      const safeAreaTop = this.getSafeAreaTop();
      this.boardOffsetY = safeAreaTop + 70; // Below score (44px) and next balls (30px) with spacing
    } else {
      // Center vertically on desktop
      this.boardOffsetY = (screenHeight - boardSize * this.cellSize) / 2 - 50;
    }

    // Initialize empty board
    this.board = [];
    for (let row = 0; row < boardSize; row++) {
      this.board[row] = [];
      for (let col = 0; col < boardSize; col++) {
        this.board[row][col] = { row, col };
      }
    }

    // Draw board background
    this.drawBoard();

    // Initialize next balls
    this.generateNextBalls();

    // Place initial balls
    this.placeNextBalls(false);

    // Score display - with crisp rendering for high DPI displays
    // Position after toggle button (40px on desktop, 35px on tablet, 30px on mobile)
    const windowWidth = window.innerWidth;
    const isMobileScreen = windowWidth <= 768;
    const isSmallMobileScreen = windowWidth <= 480;
    const toggleButtonWidth = isSmallMobileScreen ? 30 : isMobileScreen ? 35 : 40;
    const scoreX = Math.max(this.configPanelWidth, toggleButtonWidth) + 10;
    
    const devicePixelRatio = window.devicePixelRatio || 1;
    // Position with 20px padding from top, accounting for safe area (notch)
    // Get safe area inset from CSS or use 0 as fallback
    const safeAreaTop = this.getSafeAreaTop();
    const scoreY = safeAreaTop + 20;
    this.scoreText = this.add.text(Math.round(scoreX), Math.round(scoreY), 'Score: 0', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      resolution: devicePixelRatio,
      align: 'left'
    });
    // Force integer positioning to avoid subpixel blur
    // Origin (0, 0) means top-left corner, so y=20 is 20px from top
    this.scoreText.setOrigin(0, 0);

    // Next balls preview
    this.updateNextBallsPreview();

    // Leaderboard display
    this.updateLeaderboardDisplay();

    // Touch/click input - remove old handler first, then add new one
    this.input.off('pointerdown', this.handlePointerDown, this);
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.enabled = true;
  }

  private handleGameOver() {
    if (this.gameOver) return; // Already handled
    
    this.gameOver = true;
    
    // Save score to leaderboard
    const isNewHighScore = this.leaderboard.addScore(this.score);
    
    // Show game over popup
    this.showGameOverPopup(isNewHighScore);
  }

  private showGameOverPopup(isNewHighScore: boolean) {
    // Create popup overlay
    const popup = document.createElement('div');
    popup.id = 'game-over-popup';
    popup.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      flex-direction: column;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background-color: #2a2a2a;
      border: 2px solid #444;
      border-radius: 10px;
      padding: 30px;
      text-align: center;
      max-width: 90%;
      max-height: 90%;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Game Over!';
    title.style.cssText = `
      color: #ffffff;
      font-size: 28px;
      margin: 0 0 20px 0;
      font-family: Arial, sans-serif;
    `;

    const scoreLabel = document.createElement('div');
    scoreLabel.textContent = 'Your Score:';
    scoreLabel.style.cssText = `
      color: #cccccc;
      font-size: 18px;
      margin-bottom: 10px;
      font-family: Arial, sans-serif;
    `;

    const scoreValue = document.createElement('div');
    scoreValue.textContent = this.score.toString();
    scoreValue.style.cssText = `
      color: #ffffff;
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 20px;
      font-family: Arial, sans-serif;
    `;

    if (isNewHighScore) {
      const highScoreLabel = document.createElement('div');
      highScoreLabel.textContent = '🎉 New High Score! 🎉';
      highScoreLabel.style.cssText = `
        color: #ffd700;
        font-size: 20px;
        margin-bottom: 20px;
        font-family: Arial, sans-serif;
        font-weight: bold;
      `;
      content.appendChild(highScoreLabel);
    }

    const button = document.createElement('button');
    button.textContent = 'Play Again';
    button.style.cssText = `
      background-color: #646cff;
      color: white;
      border: none;
      border-radius: 5px;
      padding: 12px 30px;
      font-size: 18px;
      cursor: pointer;
      font-family: Arial, sans-serif;
      transition: background-color 0.2s;
    `;
    button.onmouseover = () => button.style.backgroundColor = '#535bf2';
    button.onmouseout = () => button.style.backgroundColor = '#646cff';
    button.onclick = () => {
      popup.remove();
      this.resetGame();
    };

    content.appendChild(title);
    content.appendChild(scoreLabel);
    content.appendChild(scoreValue);
    content.appendChild(button);
    popup.appendChild(content);
    document.body.appendChild(popup);
  }

  private updateLeaderboardDisplay() {
    // Remove old leaderboard text
    if (this.leaderboardText) {
      this.leaderboardText.destroy();
    }

    const topScores = this.leaderboard.getTopScores();
    const boardSize = this.config.boardSize;
    const isMobile = window.innerWidth <= 768;
    
    // Position leaderboard below the grid
    const leaderboardY = this.boardOffsetY + boardSize * this.cellSize + 20;
    const leaderboardX = this.boardOffsetX;

    if (topScores.length === 0) {
      // Show placeholder
      this.leaderboardText = this.add.text(
        Math.round(leaderboardX),
        Math.round(leaderboardY),
        'Leaderboard:\nNo scores yet',
        {
          fontSize: isMobile ? '14px' : '16px',
          color: '#888888',
          fontFamily: 'Arial, sans-serif',
          align: 'left'
        }
      );
      this.leaderboardText.setOrigin(0, 0);
    } else {
      // Format leaderboard entries
      const lines = ['Leaderboard:'];
      topScores.forEach((entry, index) => {
        const rank = index + 1;
        lines.push(`${rank}. ${entry.score}`);
      });

      const devicePixelRatio = window.devicePixelRatio || 1;
      this.leaderboardText = this.add.text(
        Math.round(leaderboardX),
        Math.round(leaderboardY),
        lines.join('\n'),
        {
          fontSize: isMobile ? '14px' : '16px',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          resolution: devicePixelRatio,
          align: 'left'
        }
      );
      this.leaderboardText.setOrigin(0, 0);
    }
  }

  private updateNextBallsPreview() {
    // Remove old preview
    this.nextBallsPreview.forEach(container => container.destroy());
    this.nextBallsPreview = [];

    if (this.nextBalls.length === 0) return;

    const screenWidth = this.cameras.main.width;
    const previewSize = 30;
    const spacing = 5;
    const startX = screenWidth - 20 - (previewSize * this.nextBalls.length + spacing * (this.nextBalls.length - 1));

    const safeAreaTop = this.getSafeAreaTop();
    const startY = safeAreaTop;

    // Add label - with crisp rendering for high DPI displays
    const devicePixelRatio = window.devicePixelRatio || 1;
    const label = this.add.text(Math.round(startX), Math.round(startY - 20), 'Next:', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      resolution: devicePixelRatio,
      align: 'left',
    });
    label.setOrigin(0, 0);
    this.nextBallsPreview.push(this.add.container(0, 20 + startY, [label]));

    // Add preview balls
    this.nextBalls.forEach((color, index) => {
      const x = startX + index * (previewSize + spacing) + previewSize / 2;
      const y = startY + previewSize / 2;

      const ball = this.add.circle(x, y, previewSize / 2 - 2, color);
      const container = this.add.container(0, startY + 20, [ball]);
      this.nextBallsPreview.push(container);
    });
  }

  private updateConfig(newConfig: GameConfig) {
    const boardSizeChanged = this.config.boardSize !== newConfig.boardSize;
    const ballsPerRoundChanged = this.config.ballsPerRound !== newConfig.ballsPerRound;
    
    this.config = newConfig;
    
    // Update grid verifier config
    this.gridVerifier.updateConfig({
      minLineLength: this.config.minLineLength,
      boardSize: this.config.boardSize
    });
    
    // If board size changed, reinitialize the game
    if (boardSizeChanged) {
      this.initializeGame();
      // Ensure input is active after reinitialization
      this.ensureInputActive();
    } else if (ballsPerRoundChanged) {
      // Only regenerate next balls if balls per round changed
      this.generateNextBalls();
      this.updateNextBallsPreview();
      // Ensure input is still active
      this.ensureInputActive();
    } else {
      // Regenerate next balls with new colors
      this.generateNextBalls();
      this.updateNextBallsPreview();
      // Ensure input is still active
      this.ensureInputActive();
    }

    this.updateLeaderboardDisplay();
  }

  private ensureInputActive() {
    // Use requestAnimationFrame to ensure this happens after DOM updates
    requestAnimationFrame(() => {
      // Re-enable input and ensure handlers are active
      this.input.enabled = true;
      
      // Remove and re-add input handler to ensure it's active
      this.input.off('pointerdown', this.handlePointerDown, this);
      this.input.on('pointerdown', this.handlePointerDown, this);
      
      // Ensure all balls are interactive
      for (let row = 0; row < this.config.boardSize; row++) {
        for (let col = 0; col < this.config.boardSize; col++) {
          const cell = this.board[row]?.[col];
          if (cell?.ball) {
            if (!cell.ball.input) {
              cell.ball.setInteractive();
            } else if (!cell.ball.input.enabled) {
              cell.ball.setInteractive();
            }
          }
        }
      }
      
      // Ensure scene is active
      if (this.scene.isActive()) {
        this.scene.bringToTop();
      }
    });
  }

  private resetGame() {
    this.initializeGame();
  }

  private drawBoard() {
    // Clear existing grid rectangles
    this.gridRectangles.forEach(rect => rect.destroy());
    this.gridRectangles = [];

    // Draw grid
    const boardSize = this.config.boardSize;
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const x = this.boardOffsetX + col * this.cellSize + this.cellSize / 2;
        const y = this.boardOffsetY + row * this.cellSize + this.cellSize / 2;

        // Draw cell background and store reference
        const rect = this.add.rectangle(x, y, this.cellSize - 2, this.cellSize - 2, 0x333333, 0.3);
        this.gridRectangles.push(rect);
      }
    }
  }

  private generateNextBalls() {
    this.nextBalls = [];
    if (this.config.colors.length === 0) return;
    for (let i = 0; i < this.config.ballsPerRound; i++) {
      this.nextBalls.push(this.config.colors[Phaser.Math.Between(0, this.config.colors.length - 1)]);
    }
  }

  private getEmptyCells(): Cell[] {
    const emptyCells: Cell[] = [];
    const boardSize = this.config.boardSize;
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const cell = this.board[row]?.[col];
        if (cell && !cell.ball) {
          emptyCells.push(cell);
        }
      }
    }
    return emptyCells;
  }

  
  private placeNextBalls(linesRemoved: boolean) {
    const ballsToPlace = this.config.ballsPerRound;
    let emptyCells = this.getEmptyCells();
    if (emptyCells.length < ballsToPlace) {
      this.handleGameOver();
      return;
    }

    // Shuffle and pick random empty cells
    Phaser.Utils.Array.Shuffle(emptyCells);
    for (let i = 0; i < ballsToPlace && i < emptyCells.length; i++) {
      const cell = emptyCells[i];
      const color = this.nextBalls[i];
      if (!linesRemoved) {
        this.placeBall(cell, color);
      }
    }

    if (!linesRemoved) {
      this.generateNextBalls();
      this.updateNextBallsPreview();
    }
  }

  private placeBall(cell: Cell, color: number): boolean {
    const x = this.boardOffsetX + cell.col * this.cellSize + this.cellSize / 2;
    const y = this.boardOffsetY + cell.row * this.cellSize + this.cellSize / 2;

    const ball = this.add.circle(x, y, this.cellSize / 2 - 4, color);
    ball.setInteractive();
    cell.ball = ball;
    cell.color = color;

    // Check for lines after placing
    return this.checkAndRemoveLines();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (this.gameOver) return;

    // Don't handle clicks on the config panel
    if (pointer.x < this.configPanelWidth) return;

    const col = Math.floor((pointer.x - this.boardOffsetX) / this.cellSize);
    const row = Math.floor((pointer.y - this.boardOffsetY) / this.cellSize);
    const boardSize = this.config.boardSize;

    if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
      const cell = this.board[row]?.[col];
      if (!cell) return;

      if (this.selectedCell) {
        // Try to move ball
        if (cell === this.selectedCell) {
          // Deselect
          this.deselectCell();
        } else if (!cell.ball) {
          // Try to move to empty cell
          this.moveBall(this.selectedCell, cell);
        } else if (cell.ball) {
          // Select new cell
          this.deselectCell();
          this.selectCell(cell);
        }
      } else {
        // Select cell with ball
        if (cell.ball) {
          this.selectCell(cell);
        }
      }
    } else {
      this.deselectCell();
    }
  }

  private selectCell(cell: Cell) {
    this.selectedCell = cell;
    if (cell.ball) {
      cell.ball.setStrokeStyle(3, 0xffffff);
      cell.ball.setScale(1.1);
    }
  }

  private deselectCell() {
    if (this.selectedCell && this.selectedCell.ball) {
      this.selectedCell.ball.setStrokeStyle();
      this.selectedCell.ball.setScale(1);
    }
    this.selectedCell = null;
  }

  private moveBall(from: Cell, to: Cell) {
    const path = this.findPath(from, to);
    if (path.length === 0) {
      return; // No valid path
    }

    // Get ball reference before moving
    const ball = from.ball!;
    const color = from.color!;
    
    // Deselect before moving the reference
    if (this.selectedCell === from && ball) {
      ball.setStrokeStyle();
      ball.setScale(1);
    }
    this.selectedCell = null;

    // Move ball reference immediately (so it can't be selected during animation)
    from.ball = undefined;
    from.color = undefined;
    to.ball = ball;
    to.color = color;

    // Animate through each cell in the path
    this.animateBallAlongPath(ball, path, () => {
      // Ensure deselection (in case it wasn't done above)
      this.deselectCell();
      const linesRemoved = this.checkAndRemoveLines();
      // Only place new balls if no lines were removed
      this.placeNextBalls(linesRemoved);

      var emptyCells = this.getEmptyCells();
      if (emptyCells.length == 0) {
        this.handleGameOver();
        return;
      }
    });
  }

  private animateBallAlongPath(ball: Phaser.GameObjects.Arc, path: Cell[], onComplete: () => void) {
    if (path.length <= 1) {
      // Already at destination or invalid path
      onComplete();
      return;
    }

    // Calculate duration per cell (faster for longer paths)
    const totalDuration = Math.max(200, path.length * 50);
    const durationPerCell = totalDuration / (path.length - 1);

    // Animate through each segment of the path
    let currentIndex = 0;

    const animateNext = () => {
      if (currentIndex >= path.length - 1) {
        // Reached destination
        onComplete();
        return;
      }

      const nextCell = path[currentIndex + 1];

      const targetX = this.boardOffsetX + nextCell.col * this.cellSize + this.cellSize / 2;
      const targetY = this.boardOffsetY + nextCell.row * this.cellSize + this.cellSize / 2;

      this.tweens.add({
        targets: ball,
        x: targetX,
        y: targetY,
        duration: durationPerCell,
        ease: 'Linear',
        onComplete: () => {
          currentIndex++;
          animateNext();
        }
      });
    };

    // Start animation from the first cell after the starting position
    animateNext();
  }

  private findPath(from: Cell, to: Cell): Cell[] {
    // BFS pathfinding
    const queue: Cell[] = [from];
    const visited = new Set<string>();
    const parent = new Map<string, Cell | null>();
    visited.add(`${from.row},${from.col}`);
    parent.set(`${from.row},${from.col}`, null);

    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.row === to.row && current.col === to.col) {
        // Reconstruct path
        const path: Cell[] = [];
        let node: Cell | null = to;
        while (node) {
          path.unshift(node);
          const key: string = `${node.row},${node.col}`;
          node = parent.get(key) || null;
        }
        return path;
      }

      for (const [dr, dc] of directions) {
        const newRow = current.row + dr;
        const newCol = current.col + dc;

        const boardSize = this.config.boardSize;
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize) {
          const key = `${newRow},${newCol}`;
          if (!visited.has(key)) {
            const nextCell = this.board[newRow][newCol];
            // Can only move through empty cells (except destination)
            if (!nextCell.ball || (newRow === to.row && newCol === to.col)) {
              visited.add(key);
              parent.set(key, current);
              queue.push(nextCell);
            }
          }
        }
      }
    }

    return [];
  }

  private checkAndRemoveLines(): boolean {
    const linesToRemove = this.gridVerifier.checkAndFindLines(this.board);

    if (linesToRemove.length > 0) {
      // Remove balls
      linesToRemove.forEach(cell => {
        if (cell.ball) {
          this.tweens.add({
            targets: cell.ball,
            scale: 0,
            alpha: 0,
            duration: 200,
            onComplete: () => {
              cell.ball?.destroy();
            }
          });
          cell.ball = undefined;
          cell.color = undefined;
        }
      });

      // Update score
      this.score += linesToRemove.length * 10;
      this.scoreText.setText(`Score: ${this.score}`);
      // Update leaderboard display
      this.updateLeaderboardDisplay();

      // Check again after a delay (for cascading removals)
      // Cascading removals don't trigger new balls either
      this.time.delayedCall(300, () => {
        this.checkAndRemoveLines();
      });

      return true; // Lines were removed
    }

    return false; // No lines were removed
  }
}

