import './style.css'
import Phaser from 'phaser';
import { GameScene } from './game/GameScene';
import { ConfigPanel } from './ui/ConfigPanel';

// Get device pixel ratio for high-DPI rendering
const dpr = Math.min(window.devicePixelRatio || 1, 3);

// Mobile-friendly configuration with high-DPI support
const getGameConfig = (): Phaser.Types.Core.GameConfig => {
  return {
    type: Phaser.AUTO,
    // Render at higher resolution for crisp display on high-DPI screens
    width: window.innerWidth * dpr,
    height: window.innerHeight * dpr,
    parent: 'app',
    backgroundColor: '#1a1a1a',
    scene: GameScene,
    scale: {
      mode: Phaser.Scale.NONE, // We'll handle scaling manually
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    input: {
      activePointers: 3,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: true,
    },
  };
};

const game = new Phaser.Game(getGameConfig());

// Apply CSS scaling to render crisp on high-DPI displays
const applyHighDPIScaling = () => {
  const canvas = game.canvas;
  if (canvas) {
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
};

// Apply scaling after game is ready
game.events.once('ready', applyHighDPIScaling);

// Create configuration panel
const configPanel = new ConfigPanel((config) => {
  // Dispatch config change event
  window.dispatchEvent(new CustomEvent('config-changed', { detail: config }));
});

// Send initial config to game (loaded from localStorage) after a short delay
// to ensure the game scene is ready
setTimeout(() => {
  window.dispatchEvent(new CustomEvent('config-changed', { detail: configPanel.getConfig() }));
  // Also send initial panel width
  window.dispatchEvent(new CustomEvent('config-panel-resize', { 
    detail: { width: configPanel.getPanelWidth() } 
  }));
}, 200);

// Handle window resize
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth * dpr, window.innerHeight * dpr);
  applyHighDPIScaling();
});
