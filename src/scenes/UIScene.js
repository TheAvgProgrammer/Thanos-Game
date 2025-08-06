// src/scenes/UIScene.js
export default class UIScene extends Phaser.Scene {
  constructor() {
    super("UIScene");
    this.userStats = {}; // { Ravi: totalDamage, ... }
  }

  create() {
    // UI Panel background
    this.panel = this.add.rectangle(1080, 0, 200, 720, 0x000000, 0.6).setOrigin(0, 0);

    this.title = this.add.text(1090, 20, "🏆 Today", {
      fontSize: "22px",
      fill: "#FFD700"
    });

    this.leaderboardText = this.add.text(1090, 60, "", {
      fontSize: "18px",
      fill: "#ffffff",
      lineSpacing: 8
    });

    // Listen for event from ArenaScene
    this.scene.get("ArenaScene").events.on("taskEvent", this.updateLeaderboard, this);
  }

  updateLeaderboard({ user, damage }) {
    // Update user damage
    if (!this.userStats[user]) this.userStats[user] = 0;
    this.userStats[user] += damage;

    // Sort and format
    const sorted = Object.entries(this.userStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10

    let displayText = "";
    sorted.forEach(([username, dmg], idx) => {
      displayText += `${idx + 1}. ${username} - ${dmg} dmg\n`;
    });

    this.leaderboardText.setText(displayText);
  }
}