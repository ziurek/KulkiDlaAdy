export interface GameConfig {
  colors: number[];
  minLineLength: number;
  boardSize: number;
  ballsPerRound: number;
}

export class ConfigPanel {
  private panel: HTMLDivElement;
  private colorInputs: HTMLInputElement[] = [];
  private minLineLengthInput!: HTMLSelectElement;
  private boardSizeInput!: HTMLSelectElement;
  private ballsPerRoundInput!: HTMLSelectElement;
  private onConfigChange: (config: GameConfig) => void;
  private config: GameConfig;
  private readonly STORAGE_KEY = 'colorLinesGameConfig';
  private isCollapsed: boolean = false;
  private toggleButton: HTMLButtonElement | null = null;

  constructor(onConfigChange: (config: GameConfig) => void) {
    this.onConfigChange = onConfigChange;
    
    // Load config from localStorage or use defaults
    this.config = this.loadConfig();

    this.panel = document.createElement('div');
    this.panel.id = 'config-panel';
    this.panel.innerHTML = this.createPanelHTML();
    
    // Create toggle button outside the panel so it's always visible
    this.toggleButton = document.createElement('button');
    this.toggleButton.id = 'config-toggle-btn';
    this.toggleButton.className = 'config-toggle-btn';
    this.toggleButton.type = 'button';
    this.toggleButton.title = 'Toggle Configuration';
    const icon = document.createElement('span');
    icon.id = 'toggle-icon';
    icon.textContent = '☰';
    this.toggleButton.appendChild(icon);
    
    document.body.appendChild(this.toggleButton);
    document.body.appendChild(this.panel);

    this.initializeInputs();
    this.attachEventListeners();
    
    // Apply loaded config to UI
    this.applyConfigToUI();

    // Load collapsed state from localStorage
    this.loadCollapsedState();

    // Listen for orientation/resize changes
    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('orientationchange', () => {
      // Delay to ensure orientation change is complete
      setTimeout(() => this.handleResize(), 100);
    });
  }

  private handleResize() {
    // Update panel width based on screen size
    this.updatePanelWidth();
    // Notify game about panel width change
    window.dispatchEvent(new CustomEvent('config-panel-resize', { 
      detail: { width: this.calculatePanelWidth() } 
    }));
  }

  private updatePanelWidth() {
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;
    const baseWidth = isSmallMobile ? 160 : isMobile ? 200 : 250;
    this.panel.style.width = this.isCollapsed ? '0px' : `${baseWidth}px`;
  }

  private calculatePanelWidth(): number {
    if (this.isCollapsed) return 0;
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;
    return isSmallMobile ? 160 : isMobile ? 200 : 250;
  }

  public getPanelWidth(): number {
    return this.calculatePanelWidth();
  }

  private createPanelHTML(): string {
    return `
      <div class="config-content">
        <h2>Game Configuration</h2>
        
        <div class="config-section">
          <label>Grid Size:</label>
          <select id="board-size">
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
            <option value="7">7</option>
            <option value="8">8</option>
            <option value="9" selected>9</option>
            <option value="10">10</option>
            <option value="11">11</option>
            <option value="12">12</option>
          </select>
        </div>

        <div class="config-section">
          <label>Balls Per Round:</label>
          <select id="balls-per-round">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3" selected>3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>

        <div class="config-section">
          <label>Minimum Line Length:</label>
          <select id="min-line-length">
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5" selected>5</option>
            <option value="6">6</option>
            <option value="7">7</option>
            <option value="8">8</option>
          </select>
        </div>

        <div class="config-section">
          <label>Ball Colors:</label>
          <div id="color-list"></div>
          <button id="add-color-btn" type="button">Add Color</button>
          <button id="remove-color-btn" type="button">Remove Last</button>
        </div>

        <div class="config-section">
          <button id="reset-btn" type="button">Reset Game</button>
        </div>
      </div>
    `;
  }

  private initializeInputs() {
    this.minLineLengthInput = document.getElementById('min-line-length') as HTMLSelectElement;
    this.boardSizeInput = document.getElementById('board-size') as HTMLSelectElement;
    this.ballsPerRoundInput = document.getElementById('balls-per-round') as HTMLSelectElement;
  }

  private applyConfigToUI() {
    // Set input values from config
    // Ensure minimum line length is valid, default to 5 if not
    const validMinLineLengths = [3, 4, 5, 6, 7, 8];
    const minLineLength = validMinLineLengths.includes(this.config.minLineLength) ? this.config.minLineLength : 5;
    this.minLineLengthInput.value = minLineLength.toString();
    
    // Ensure board size is valid, default to 9 if not
    const validBoardSizes = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const boardSize = validBoardSizes.includes(this.config.boardSize) ? this.config.boardSize : 9;
    this.boardSizeInput.value = boardSize.toString();
    
    // Ensure balls per round is valid, default to 3 if not
    const validBallsPerRound = [1, 2, 3, 4, 5];
    const ballsPerRound = validBallsPerRound.includes(this.config.ballsPerRound) ? this.config.ballsPerRound : 3;
    this.ballsPerRoundInput.value = ballsPerRound.toString();

    // Clear existing color inputs
    const colorList = document.getElementById('color-list') as HTMLDivElement;
    colorList.innerHTML = '';
    this.colorInputs = [];

    // Add color inputs from config
    this.config.colors.forEach((color) => {
      this.addColorInput(color, colorList);
    });

    // Trigger initial config update to sync with game
    this.updateConfig();
  }

  private addColorInput(color: number, container: HTMLDivElement) {
    const colorWrapper = document.createElement('div');
    colorWrapper.className = 'color-input-wrapper';
    
    // Create color pill (visual representation)
    const colorPill = document.createElement('div');
    colorPill.className = 'color-pill';
    colorPill.style.backgroundColor = this.phaserColorToHex(color);
    
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = this.phaserColorToHex(color);
    colorInput.className = 'color-input';
    
    // Update pill color when input changes
    colorInput.addEventListener('input', () => {
      const newColor = colorInput.value;
      colorPill.style.backgroundColor = newColor;
      this.updateConfig();
    });
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-color-btn';
    removeBtn.onclick = () => {
      const index = this.colorInputs.indexOf(colorInput);
      if (index > -1 && this.colorInputs.length > 2) {
        this.colorInputs.splice(index, 1);
        colorWrapper.remove();
        this.updateConfig();
      }
    };
    
    colorWrapper.appendChild(colorPill);
    colorWrapper.appendChild(colorInput);
    colorWrapper.appendChild(removeBtn);
    container.appendChild(colorWrapper);
    
    this.colorInputs.push(colorInput);
  }

  private attachEventListeners() {
    // Toggle button
    if (this.toggleButton) {
      this.toggleButton.addEventListener('click', () => {
        this.toggleCollapse();
      });
    }

    this.minLineLengthInput.addEventListener('change', () => {
      this.updateConfig();
    });

    this.boardSizeInput.addEventListener('change', () => {
      this.updateConfig();
    });

    this.ballsPerRoundInput.addEventListener('change', () => {
      this.updateConfig();
    });

    const addColorBtn = document.getElementById('add-color-btn') as HTMLButtonElement;
    addColorBtn.addEventListener('click', () => {
      const colorList = document.getElementById('color-list') as HTMLDivElement;
      // Generate a random color
      const newColor = Math.floor(Math.random() * 0xffffff);
      this.addColorInput(newColor, colorList);
      this.updateConfig();
    });

    const removeColorBtn = document.getElementById('remove-color-btn') as HTMLButtonElement;
    removeColorBtn.addEventListener('click', () => {
      if (this.colorInputs.length > 2) {
        const lastInput = this.colorInputs.pop();
        if (lastInput) {
          lastInput.parentElement?.remove();
          this.updateConfig();
        }
      }
    });

    const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset the game? This will clear the board.')) {
        window.dispatchEvent(new CustomEvent('reset-game'));
      }
    });
  }

  private updateConfig() {
    const colors = this.colorInputs.map(input => this.hexToPhaserColor(input.value));
    const minLineLength = parseInt(this.minLineLengthInput.value) || 5;
    const boardSize = parseInt(this.boardSizeInput.value) || 9;
    const ballsPerRound = parseInt(this.ballsPerRoundInput.value) || 3;

    // Valid minimum line lengths
    const validMinLineLengths = [3, 4, 5, 6, 7, 8];
    const validMinLineLength = validMinLineLengths.includes(minLineLength) ? minLineLength : 5;
    
    // Valid board sizes
    const validBoardSizes = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const validBoardSize = validBoardSizes.includes(boardSize) ? boardSize : 9;
    
    // Valid balls per round
    const validBallsPerRound = [1, 2, 3, 4, 5];
    const validBallsPerRoundValue = validBallsPerRound.includes(ballsPerRound) ? ballsPerRound : 3;

    this.config = {
      colors: colors.length >= 2 ? colors : this.config.colors,
      minLineLength: validMinLineLength,
      boardSize: validBoardSize,
      ballsPerRound: validBallsPerRoundValue
    };

    // Save to localStorage
    this.saveConfig(this.config);

    this.onConfigChange(this.config);
    
    // Blur any active inputs to ensure game can receive pointer events
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  private loadConfig(): GameConfig {
    const defaultConfig: GameConfig = {
      colors: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500],
      minLineLength: 5,
      boardSize: 9,
      ballsPerRound: 3
    };

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return defaultConfig;
      }

      const parsed = JSON.parse(stored) as Partial<GameConfig>;
      
      // Validate and merge with defaults
      const config: GameConfig = {
        colors: Array.isArray(parsed.colors) && parsed.colors.length >= 2 
          ? parsed.colors.filter((c: any) => typeof c === 'number' && c >= 0 && c <= 0xffffff)
          : defaultConfig.colors,
        minLineLength: typeof parsed.minLineLength === 'number' && [3, 4, 5, 6, 7, 8].includes(parsed.minLineLength)
          ? parsed.minLineLength
          : defaultConfig.minLineLength,
        boardSize: typeof parsed.boardSize === 'number' && [3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(parsed.boardSize)
          ? parsed.boardSize
          : defaultConfig.boardSize,
        ballsPerRound: typeof parsed.ballsPerRound === 'number' && [1, 2, 3, 4, 5].includes(parsed.ballsPerRound)
          ? parsed.ballsPerRound
          : defaultConfig.ballsPerRound
      };

      // Ensure at least 2 colors
      if (config.colors.length < 2) {
        config.colors = defaultConfig.colors;
      }

      return config;
    } catch (error) {
      console.warn('Failed to load config from localStorage:', error);
      return defaultConfig;
    }
  }

  private saveConfig(config: GameConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to save config to localStorage:', error);
    }
  }

  private phaserColorToHex(color: number): string {
    return '#' + color.toString(16).padStart(6, '0');
  }

  private hexToPhaserColor(hex: string): number {
    return parseInt(hex.substring(1), 16);
  }

  private toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.updatePanelWidth();
    this.updateToggleButton();
    this.updatePanelClass();
    this.saveCollapsedState();
    
    // Notify game about panel width change
    // Add a small delay to match CSS transition (0.3s) plus a bit for safety
    const newWidth = this.calculatePanelWidth();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('config-panel-resize', { 
        detail: { width: newWidth } 
      }));
    }, 350);
  }

  private updateToggleButton() {
    if (this.toggleButton) {
      const icon = this.toggleButton.querySelector('#toggle-icon') as HTMLElement;
      if (icon) {
        icon.textContent = this.isCollapsed ? '☰' : '✕';
      }
      this.toggleButton.title = this.isCollapsed ? 'Show Configuration' : 'Hide Configuration';
    }
  }

  private updatePanelClass() {
    if (this.isCollapsed) {
      this.panel.classList.add('collapsed');
    } else {
      this.panel.classList.remove('collapsed');
    }
  }

  private saveCollapsedState() {
    try {
      localStorage.setItem('colorLinesGameConfigCollapsed', JSON.stringify(this.isCollapsed));
    } catch (error) {
      console.warn('Failed to save collapsed state:', error);
    }
  }

  private loadCollapsedState() {
    try {
      const stored = localStorage.getItem('colorLinesGameConfigCollapsed');
      if (stored !== null) {
        this.isCollapsed = JSON.parse(stored) === true;
      }
    } catch (error) {
      console.warn('Failed to load collapsed state:', error);
    }
    this.updatePanelWidth();
    this.updateToggleButton();
    this.updatePanelClass();
    
    // Notify game about initial panel width
    // Use a small delay to ensure game scene is ready
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('config-panel-resize', { 
        detail: { width: this.calculatePanelWidth() } 
      }));
    }, 150);
  }

  public getConfig(): GameConfig {
    return this.config;
  }

  public destroy() {
    if (this.toggleButton) {
      this.toggleButton.remove();
    }
    this.panel.remove();
  }
}

