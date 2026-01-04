export interface LeaderboardEntry {
  score: number;
  date: string;
}

const LEADERBOARD_KEY = 'colorLinesLeaderboard';
const MAX_ENTRIES = 5;

export class Leaderboard {
  private entries: LeaderboardEntry[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const stored = localStorage.getItem(LEADERBOARD_KEY);
      if (stored) {
        this.entries = JSON.parse(stored);
        // Ensure we only have top entries
        this.entries = this.entries.slice(0, MAX_ENTRIES);
      }
    } catch (error) {
      console.warn('Failed to load leaderboard:', error);
      this.entries = [];
    }
  }

  private save() {
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(this.entries));
    } catch (error) {
      console.warn('Failed to save leaderboard:', error);
    }
  }

  addScore(score: number): boolean {
    // Check if score qualifies for leaderboard
    if (this.entries.length < MAX_ENTRIES || score > this.entries[this.entries.length - 1].score) {
      const entry: LeaderboardEntry = {
        score,
        date: new Date().toISOString()
      };

      this.entries.push(entry);
      // Sort by score descending
      this.entries.sort((a, b) => b.score - a.score);
      // Keep only top entries
      this.entries = this.entries.slice(0, MAX_ENTRIES);
      this.save();
      return true; // New high score
    }
    return false; // Didn't make it to leaderboard
  }

  getTopScores(): LeaderboardEntry[] {
    return [...this.entries];
  }

  clear() {
    this.entries = [];
    this.save();
  }
}

