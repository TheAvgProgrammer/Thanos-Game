// src/main.js
import Phaser from "phaser";
import ArenaScene from "./scenes/ArenaScene";
import UIScene from "./scenes/UIScene";

const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE,   // Automatically resize with window
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  backgroundColor: "#000000",
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  scene: [ArenaScene, UIScene]
};

const game = new Phaser.Game(config);
