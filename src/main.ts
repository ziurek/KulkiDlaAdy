import './style.css'
import Phaser from 'phaser';
import { GameScene } from './game/GameScene';
import { ConfigPanel } from './ui/ConfigPanel';

// Mobile-friendly configuration
const getGameConfig = (): Phaser.Types.Core.GameConfig => {
  return {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'app',
    backgroundColor: '#1a1a1a',
    scene: GameScene,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      activePointers: 3,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
    },
  };
};

const game = new Phaser.Game(getGameConfig());

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
  game.scale.resize(window.innerWidth, window.innerHeight);
});
