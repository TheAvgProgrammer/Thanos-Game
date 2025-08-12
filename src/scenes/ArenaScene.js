import { getRandomTask } from "../data/dummyData";

const CONFIG = {
  thanos: {
    scale: 1.1,
    yPosition: 450,
    xOffset: 300,
    hitEffect: { scaleIncrease: 0.08, tintColor: 0xff0000, duration: 49 },
  },
  attacker: {
    scale: 2,
    spawnXOffset: 150,
    yPosition: 570,
    attackOffset: 150,
    animation: { duration: 500, ease: "Power1" },
    heavy: {
      holdFrameIndex: 2,   // 3rd frame
      holdMs: 700,         // 0.7s hold before the dash
      dashDuration: 260,   // dash speed
    },
  },
  defeatBanner: {
    fontSize: "64px",
    color: "#ffffff",
    stroke: "#000000",
    strokeThickness: 8,
  },
};

export default class ArenaScene extends Phaser.Scene {
  constructor() {
    super("ArenaScene");
    this.isThanosDead = false;
    this.isBusy = false; // prevents overlapping actions
  }

  preload() {
    // BG + Thanos
    this.load.image("background", "assets/background.png");
    this.load.image("background_far", "assets/background_far.png");
    this.load.image("thanos", "assets/thanos.png");

    // Fighter
    this.load.spritesheet("fighter_idle",  "assets/avatars/Fighter/Idle.png",  { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet("fighter_walk",  "assets/avatars/Fighter/Walk.png",  { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet("fighter_run",   "assets/avatars/Fighter/Run.png",   { frameWidth: 128, frameHeight: 128 });

    // Attacks
    this.load.spritesheet("fighter_attack1", "assets/avatars/Fighter/Attack_1.png", { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet("fighter_attack2", "assets/avatars/Fighter/Attack_2.png", { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet("fighter_attack3", "assets/avatars/Fighter/Attack_3.png", { frameWidth: 128, frameHeight: 128 });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.input.setTopOnly(true); // make button clicks reliable

    // Backgrounds
    this.bgFar = this.add.tileSprite(width / 2, height / 2, width, height, "background_far").setScrollFactor(0);
    this.bgNear = this.add.tileSprite(width / 2, height / 2 + 200, width * 2, height * 2, "background").setScrollFactor(0);

    this.createAnimations();

    // Thanos
    this.thanos = this.add
      .image(width - CONFIG.thanos.xOffset, CONFIG.thanos.yPosition, "thanos")
      .setScale(CONFIG.thanos.scale)
      .setDepth(2);

    // Fighter
    this.attacker = this.add
      .sprite(CONFIG.attacker.spawnXOffset, CONFIG.attacker.yPosition)
      .setScale(CONFIG.attacker.scale)
      .setDepth(2);

    this.attacker.play("fighter_walk_anim");

    // UI: buttons
    this.makeButtons();

    // Defeat banner (hidden)
    this.defeatText = this.add
      .text(width / 2, height / 2, "THANOS HAS BEEN DEFEATED", {
        fontFamily: "sans-serif",
        fontSize: CONFIG.defeatBanner.fontSize,
        color: CONFIG.defeatBanner.color,
        stroke: CONFIG.defeatBanner.stroke,
        strokeThickness: CONFIG.defeatBanner.strokeThickness,
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setAlpha(0);

    this.scale.on("resize", this.resize, this);
  }

  makeButtons() {
    const makeRectBtn = (x, y, label, onClick) => {
      const bg = this.add
        .rectangle(x, y, 120, 42, 0x1f2937, 0.95)
        .setStrokeStyle(2, 0x93c5fd)
        .setScrollFactor(0)
        .setDepth(100)
        .setInteractive({ useHandCursor: true });

      const txt = this.add
        .text(x, y, label, { fontFamily: "sans-serif", fontSize: "18px", color: "#ffffff" })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(101);

      bg.on("pointerover", () => bg.setFillStyle(0x374151, 1));
      bg.on("pointerout",  () => bg.setFillStyle(0x1f2937, 0.95));
      bg.on("pointerdown", () => { if (!this.isBusy && !this.isThanosDead) onClick(); });
      return { bg, txt };
    };

    // Top-left: Light (Attack2) and Heavy (Attack1 special)
    this.lightBtn = makeRectBtn(110, 60, "LIGHT", () => this.lightAttack());
    this.heavyBtn = makeRectBtn(230, 60, "HEAVY", () => this.heavyAttack());
  }

  createAnimations() {
    const loopAnim = (key, spriteKey, rate = 10) => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(spriteKey), frameRate: rate, repeat: -1 });
    };
    const oneShotAnim = (key, spriteKey, rate = 12) => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(spriteKey), frameRate: rate, repeat: 0 });
    };

    loopAnim("fighter_idle_anim", "fighter_idle", 8);
    loopAnim("fighter_walk_anim", "fighter_walk", 10);
    loopAnim("fighter_run_anim",  "fighter_run",  20);

    oneShotAnim("fighter_attack1_anim", "fighter_attack1", 14);
    oneShotAnim("fighter_attack2_anim", "fighter_attack2", 14);
    oneShotAnim("fighter_attack3_anim", "fighter_attack3", 14);
  }

  // ------------------- ATTACKS -------------------

  // Light = simple run-in + Attack2; never kills.
  lightAttack() {
    if (this.isThanosDead || this.isBusy) return;
    this.isBusy = true;

    const originalX = this.attacker.x;
    const groundY   = CONFIG.attacker.yPosition;
    const targetX   = this.thanos.x - CONFIG.attacker.attackOffset;

    this.attacker.play("fighter_run_anim", true);
    this.tweens.add({
      targets: this.attacker,
      x: targetX,
      duration: CONFIG.attacker.animation.duration,
      ease: CONFIG.attacker.animation.ease,
      onComplete: () => {
        this.attacker.play("fighter_attack2_anim", true);

        // light hit feedback only
        this.time.delayedCall(150, () => {
          this.cameras.main.shake(120, 0.004);
          this.hitThanosEffect();
        });

        this.attacker.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
          this.returnToStart(originalX, groundY);
        });
      }
    });
  }

heavyAttack() {
  if (this.isThanosDead || this.isBusy) return;
  this.isBusy = true;

  const originalX = this.attacker.x;
  const groundY   = CONFIG.attacker.yPosition;
  const targetX   = this.thanos.x - CONFIG.attacker.attackOffset;

  // Start Attack1 and PAUSE on 3rd frame
  this.attacker.play("fighter_attack1_anim", true);
  const anim   = this.attacker.anims.currentAnim;
  const frames = anim ? anim.frames : [];
  const holdIx = Math.min(CONFIG.attacker.heavy.holdFrameIndex, Math.max(0, frames.length - 1));
  if (frames.length) this.attacker.anims.pause(frames[holdIx]); else this.attacker.anims.pause();

  // Hold for 0.7s, THEN dash while still frozen
  this.time.delayedCall(CONFIG.attacker.heavy.holdMs, () => {
    this.tweens.add({
      targets: this.attacker,
      x: targetX,
      duration: CONFIG.attacker.heavy.dashDuration,
      ease: "Quad.easeOut",
      onComplete: () => {
        // Resume the remainder of Attack1
        this.attacker.anims.resume();

        // Impact & kill shortly after resuming
        this.time.delayedCall(120, () => {
          this.cameras.main.shake(220, 0.006);

          // 🔴 Show red flash before starting death sequence
          this.thanos.setTint(0xff0000);

          // Keep tint for 150ms, then clear & kill
          this.time.delayedCall(150, () => {
            this.thanos.clearTint();
            this.killThanosLikeMario(); // start death animation
          });
        });

        // After animation completes, return to start (even after death)
        this.attacker.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
          this.returnToStart(originalX, groundY);
        });
      }
    });
  });
}


  // ------------------- HIT / DEATH / RETURN -------------------

  returnToStart(originalX, groundY) {
    this.tweens.add({
      targets: this.attacker,
      x: originalX,
      y: groundY,
      duration: CONFIG.attacker.animation.duration,
      ease: CONFIG.attacker.animation.ease,
      onStart: () => this.attacker.play("fighter_run_anim", true),
      onComplete: () => {
        this.attacker.play("fighter_walk_anim", true);
        this.isBusy = false;
      }
    });
  }

  hitThanosEffect() {
    // if (this.isThanosDead) return;
    this.thanos.setTint(CONFIG.thanos.hitEffect.tintColor);
    this.tweens.add({
      targets: this.thanos,
      scale: this.thanos.scale + CONFIG.thanos.hitEffect.scaleIncrease,
      duration: CONFIG.thanos.hitEffect.duration,
      yoyo: true,
      ease: "Quad.easeInOut",
      onComplete: () => { if (!this.isThanosDead) this.thanos.clearTint(); }
    });
  }

killThanosLikeMario() {
  if (this.isThanosDead) return;
  this.isThanosDead = true;
  this.thanos.clearTint();

  const upDistance = 180;
  const dropY = this.cameras.main.height + 200;

  // Pop up, then fall
  this.tweens.add({
    targets: this.thanos,
    y: this.thanos.y - upDistance,
    duration: 350,
    ease: "Quad.easeOut",
    onComplete: () => {
      // 🔁 Blink while falling
      let blinkCount = 0;
      const blinkTimer = this.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
          this.thanos.visible = !this.thanos.visible;
          blinkCount++;
          if (blinkCount > 10) { // stop after ~1s
            this.thanos.visible = true;
            blinkTimer.remove();
          }
        }
      });

      // Fall down
      this.tweens.add({
        targets: this.thanos,
        y: dropY,
        alpha: 0,
        duration: 900,
        ease: "Quad.easeIn",
        onComplete: () => {
          this.thanos.destroy();
          this.showDefeatBanner();
        }
      });
    }
  });
}

  showDefeatBanner() {
    this.defeatText.setAlpha(0).setVisible(true);
    this.tweens.add({ targets: this.defeatText, alpha: 1, duration: 600, ease: "Quad.easeOut" });
  }

  // ------------------- LOOP & RESIZE -------------------

  update() {
    if (this.bgFar)  this.bgFar.tilePositionX += 0.1;
    if (this.bgNear) this.bgNear.tilePositionX += 0.3;
  }

  resize(gameSize) {
    const { width, height } = gameSize;
    this.cameras.resize(width, height);

    if (this.bgFar)  this.bgFar.setDisplaySize(width / 3, height / 3).setPosition(width / 2, height / 2);
    if (this.bgNear) this.bgNear.setDisplaySize(width / 5, height / 5).setPosition(width / 2, height / 2);

    if (this.thanos && !this.isThanosDead) {
      this.thanos.setPosition(width - CONFIG.thanos.xOffset, CONFIG.thanos.yPosition);
    }

    if (this.attacker) {
      this.attacker.setPosition(
        Math.min(this.attacker.x, width - 20),
        CONFIG.attacker.yPosition
      );
    }

    if (this.defeatText) this.defeatText.setPosition(width / 2, height / 2);
  }
}
