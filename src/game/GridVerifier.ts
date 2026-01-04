interface Cell {
  row: number;
  col: number;
  ball?: any;
  color?: number;
}

interface GridVerifierConfig {
  minLineLength: number;
  boardSize: number;
}

export class GridVerifier {
  private config: GridVerifierConfig;

  constructor(config: GridVerifierConfig) {
    this.config = config;
  }

  updateConfig(config: GridVerifierConfig) {
    this.config = config;
  }

  /**
   * Checks the entire board for lines and returns all cells that should be removed
   * @param board The game board (2D array of cells)
   * @returns Array of cells that form lines and should be removed
   */
  checkAndFindLines(board: Cell[][]): Cell[] {
    const linesToRemove: Cell[] = [];
    const checked = new Set<string>();
    const boardSize = this.config.boardSize;

    // Check all directions
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const cell = board[row]?.[col];
        if (!cell || !cell.ball || checked.has(`${row},${col}`)) continue;

        const minLength = this.config.minLineLength;

        // Check horizontal
        const horizontal = this.checkLine(cell, board, 0, 1);
        if (horizontal.length >= minLength) {
          horizontal.forEach(c => {
            if (!checked.has(`${c.row},${c.col}`)) {
              linesToRemove.push(c);
              checked.add(`${c.row},${c.col}`);
            }
          });
        }

        // Check vertical
        const vertical = this.checkLine(cell, board, 1, 0);
        if (vertical.length >= minLength) {
          vertical.forEach(c => {
            if (!checked.has(`${c.row},${c.col}`)) {
              linesToRemove.push(c);
              checked.add(`${c.row},${c.col}`);
            }
          });
        }

        // Check diagonal \
        const diag1 = this.checkLine(cell, board, 1, 1);
        if (diag1.length >= minLength) {
          diag1.forEach(c => {
            if (!checked.has(`${c.row},${c.col}`)) {
              linesToRemove.push(c);
              checked.add(`${c.row},${c.col}`);
            }
          });
        }

        // Check diagonal /
        const diag2 = this.checkLine(cell, board, 1, -1);
        if (diag2.length >= minLength) {
          diag2.forEach(c => {
            if (!checked.has(`${c.row},${c.col}`)) {
              linesToRemove.push(c);
              checked.add(`${c.row},${c.col}`);
            }
          });
        }
      }
    }

    return linesToRemove;
  }

  /**
   * Checks for a line of the same color starting from a given cell in a specific direction
   * @param startCell The starting cell
   * @param board The game board
   * @param dr Row direction (-1, 0, or 1)
   * @param dc Column direction (-1, 0, or 1)
   * @returns Array of cells forming the line
   */
  private checkLine(startCell: Cell, board: Cell[][], dr: number, dc: number): Cell[] {
    if (!startCell.ball || !startCell.color) return [];

    const line: Cell[] = [startCell];
    const color = startCell.color;
    const boardSize = this.config.boardSize;
    
    // Check in positive direction
    let row = startCell.row + dr;
    let col = startCell.col + dc;
    while (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
      const cell = board[row]?.[col];
      if (!cell) break;
      if (cell.ball && cell.color === color) {
        line.push(cell);
        row += dr;
        col += dc;
      } else {
        break;
      }
    }

    // Check in negative direction
    row = startCell.row - dr;
    col = startCell.col - dc;
    while (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
      const cell = board[row]?.[col];
      if (!cell) break;
      if (cell.ball && cell.color === color) {
        line.unshift(cell);
        row -= dr;
        col -= dc;
      } else {
        break;
      }
    }

    return line;
  }
}

