import Phaser from "phaser";

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
    animation: { duration: 900, ease: "Power1" },
    lightDashDuration: 500,
    heavy: {
      holdFrameIndex: 2,
      holdMs: 700,
      dashDuration: 260,
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
    this.isBusy = false;

    this.charOrder = ["fighter", "shinobi", "samurai"];
    this.charIndex = 0;
    this.charPrefix = this.charOrder[this.charIndex];
  }

  preload() {
    // Backgrounds
    this.load.image("background", "assets/background.png");
    this.load.image("background_far", "assets/background_far.png");
    this.load.image("thanos", "assets/thanos.png");

    // Character sheets
    const loadChar = (prefix) => {
      this.load.spritesheet(`${prefix}_idle`,    `assets/avatars/${this.cap(prefix)}/Idle.png`,     { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`${prefix}_walk`,    `assets/avatars/${this.cap(prefix)}/Walk.png`,     { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`${prefix}_run`,     `assets/avatars/${this.cap(prefix)}/Run.png`,      { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`${prefix}_attack1`, `assets/avatars/${this.cap(prefix)}/Attack_1.png`, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`${prefix}_attack2`, `assets/avatars/${this.cap(prefix)}/Attack_2.png`, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`${prefix}_attack3`, `assets/avatars/${this.cap(prefix)}/Attack_3.png`, { frameWidth: 128, frameHeight: 128 });
    };
    loadChar("fighter");
    loadChar("shinobi");
    loadChar("samurai");

    // Sounds
    this.load.audio("sfx_slash",  "assets/Sounds/slash.mp3");
    this.load.audio("sfx_impact", "assets/Sounds/impact.mp3");
    this.load.audio("sfx_change", "assets/Sounds/change.mp3");
  }

  create() {
    const { width, height } = this.cameras.main;

    this.input.setTopOnly(true);

    // Parallax
    this.bgFar  = this.add.tileSprite(width / 2, height / 2, width, height, "background_far").setScrollFactor(0);
    this.bgNear = this.add.tileSprite(width / 2, height / 2 + 200, width * 2, height * 2, "background").setScrollFactor(0);

    // Anims for all characters
    this.createAllCharactersAnims();

    // Thanos
    this.thanos = this.add
      .image(width - CONFIG.thanos.xOffset, CONFIG.thanos.yPosition, "thanos")
      .setScale(CONFIG.thanos.scale)
      .setDepth(2);

    // Attacker
    this.attacker = this.add
      .sprite(CONFIG.attacker.spawnXOffset, CONFIG.attacker.yPosition, this.sheetKey("idle"), 0)
      .setScale(CONFIG.attacker.scale)
      .setDepth(2)
      .setOrigin(0.5, 0.5);

    this.attacker.play(this.animKey("walk"));

    // Buttons
    this.makeButtons();

    // Banner
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

  // ---------- helpers ----------
  cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  sheetKey(name) { return `${this.charPrefix}_${name}`; }
  animKey(name)  { return `${this.charPrefix}_${name}_anim`; }

  createAnimsFor(prefix) {
    const ensure = (key, sheetKey, frameRate = 12, repeat = -1) => {
      if (this.anims.exists(key)) return;
      const tex = this.textures.get(sheetKey);
      const total = tex ? tex.frameTotal : 0;
      const max = Math.max(0, total - 1);
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(sheetKey, { start: 0, end: max }),
        frameRate,
        repeat
      });
    };
    ensure(`${prefix}_idle_anim`,    `${prefix}_idle`,     8,  -1);
    ensure(`${prefix}_walk_anim`,    `${prefix}_walk`,    12,  -1);
    ensure(`${prefix}_run_anim`,     `${prefix}_run`,     16,  -1);
    ensure(`${prefix}_attack1_anim`, `${prefix}_attack1`, 14,   0);
    ensure(`${prefix}_attack2_anim`, `${prefix}_attack2`, 14,   0);
    ensure(`${prefix}_attack3_anim`, `${prefix}_attack3`, 14,   0);
  }

  createAllCharactersAnims() {
    ["fighter", "shinobi", "samurai"].forEach(p => this.createAnimsFor(p));
  }

  setCharacter(prefix) {
    if (this.charPrefix === prefix) return;
    this.charPrefix = prefix;
    this.attacker.setTexture(this.sheetKey("idle"), 0);
    this.attacker.play(this.animKey("walk"), true);
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

    this.lightBtn  = makeRectBtn(110, 60, "LIGHT",  () => this.lightAttack());
    this.heavyBtn  = makeRectBtn(230, 60, "HEAVY",  () => this.heavyAttack());
    this.changeBtn = makeRectBtn(350, 60, "CHANGE", () => {
      this.sound.play("sfx_change", { volume: 0.5 });
      this.charIndex = (this.charIndex + 1) % this.charOrder.length;
      this.setCharacter(this.charOrder[this.charIndex]);
    });
  }

  // ---------- Screen FX ----------
  hitStop(ms = 80) {
    const prevTimeScale = this.time.timeScale;
    const prevTweenScale = this.tweens.timeScale;
    this.time.timeScale = 0.0001;
    this.tweens.timeScale = 0.0001;
    this.time.delayedCall(ms, () => {
      this.time.timeScale = prevTimeScale;
      this.tweens.timeScale = prevTweenScale;
    });
  }

  zoomShake(zoom = 1.06, dur = 140, shake = 0.006) {
    const cam = this.cameras.main;
    const baseZoom = cam.zoom;
    cam.zoomTo(baseZoom * zoom, dur, "Quad.easeOut", true);
    cam.shake(dur, shake);
    this.time.delayedCall(dur + 60, () => cam.zoomTo(baseZoom, 160, "Quad.easeIn", true));
  }

  whiteFlash(alpha = 0.6, dur = 60) {
    this.cameras.main.flash(dur, 255, 255, 255, false);
  }

  // ---------- Light knockback ----------
  thanosKnock(px = 24, dur = 90) {
    if (!this.thanos || this.isThanosDead) return;
    this.tweens.addCounter({
      from: 0, to: 1, duration: dur, yoyo: true, ease: "Quad.easeOut",
      onUpdate: (tw) => {
        const t = tw.getValue();
        this.thanos.x = this.cameras.main.width - CONFIG.thanos.xOffset + px * t;
      }
    });
  }

  // ------------------- ATTACKS -------------------
  lightAttack() {
    if (this.isThanosDead || this.isBusy) return;
    this.isBusy = true;

    const originalX = this.attacker.x;
    const groundY   = CONFIG.attacker.yPosition;
    const targetX   = this.thanos.x - CONFIG.attacker.attackOffset;
    const animstr = "attack" + (Math.floor(Math.random() * 3) + 1); // Randomly choose attack1, attack2, or attack3
    console.log("Light attack anim:", animstr);
    
    // Start running towards Thanos
    this.attacker.play(this.animKey("run"), true);

    this.tweens.add({
      targets: this.attacker,
      x: targetX,
      duration: CONFIG.attacker.lightDashDuration,
      ease: "Quad.easeOut",
      onComplete: () => {
        // Play attack animation when reaching Thanos
        this.attacker.play(this.animKey(animstr), true);
        
        this.sound.play("sfx_impact", { volume: 0.7 });
        this.sound.play("sfx_slash", { volume: 0.6, rate: 1.05 });

        // Impact effects
        this.time.delayedCall(120, () => {
          this.cameras.main.shake(220, 0.006);

          this.thanos.setTint(0xff0000);
          this.time.delayedCall(150, () => {
            if (!this.isThanosDead) {
              this.thanos.clearTint();
            }
          });
        });

        // Return after attack completes - Listen for the CORRECT animation!
        const attackKey = this.animKey(animstr); // Use the same animation string we played!
        const handleComplete = () => {
          this.attacker.off(`animationcomplete-${attackKey}`, handleComplete);
          this.returnToStart(originalX, groundY);
        };
        this.attacker.once(`animationcomplete-${attackKey}`, handleComplete);
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
    this.attacker.play(this.animKey("attack1"), true);
    const anim   = this.attacker.anims.currentAnim;
    const frames = anim ? anim.frames : [];
    const holdIx = Math.min(CONFIG.attacker.heavy.holdFrameIndex, Math.max(0, frames.length - 1));
    if (frames.length) this.attacker.anims.pause(frames[holdIx]); else this.attacker.anims.pause();

    // Hold then dash while frozen
    this.time.delayedCall(CONFIG.attacker.heavy.holdMs, () => {
      this.sound.play("sfx_impact", { volume: 0.7 });
      this.sound.play("sfx_slash",  { volume: 0.6, rate: 1.05 });

      this.tweens.add({
        targets: this.attacker,
        x: targetX,
        duration: CONFIG.attacker.heavy.dashDuration,
        ease: "Quad.easeOut",
        onComplete: () => {
          // Resume remainder of Attack1
          this.attacker.anims.resume();

          // Impact & kill shortly after resuming
          this.time.delayedCall(120, () => {
            this.whiteFlash(0.6, 60); // heavy only
            this.cameras.main.shake(220, 0.006);

            this.thanos.setTint(0xff0000);
            this.time.delayedCall(150, () => {
              this.thanos.clearTint();
              this.killThanosLikeMario();
            });
          });

          // Return after attack completes
          const attackKey = this.animKey("attack1");
          const handleComplete = () => {
            this.attacker.off(`animationcomplete-${attackKey}`, handleComplete);
            this.returnToStart(originalX, groundY);
          };
          this.attacker.once(`animationcomplete-${attackKey}`, handleComplete);
        }
      });
    });
  }

  // ------------------- HIT / DEATH / RETURN -------------------
  returnToStart(originalX, groundY) {
    console.log("returnToStart called");
    
    // Clean up any existing tweens on the attacker to avoid conflicts
    this.tweens.killTweensOf(this.attacker);
    
    // First, flip the character to face left (running away)
    this.attacker.setFlipX(true);
    
    this.tweens.add({
      targets: this.attacker,
      x: originalX,
      y: groundY,
      duration: CONFIG.attacker.animation.duration,
      ease: CONFIG.attacker.animation.ease,
      onStart: () => {
        console.log("Return tween started");
        this.attacker.play(this.animKey("run"), true);
      },
      onComplete: () => {
        console.log("Return to start complete - setting isBusy to false");
        // Flip back to face right (normal direction)
        this.attacker.setFlipX(false);
        this.attacker.play(this.animKey("walk"), true);
        this.isBusy = false;
      }
    });
  }

  hitThanosEffect() {
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

    this.tweens.add({
      targets: this.thanos,
      y: this.thanos.y - upDistance,
      duration: 350,
      ease: "Quad.easeOut",
      onComplete: () => {
        let blinkCount = 0;
        const blinkTimer = this.time.addEvent({
          delay: 100,
          loop: true,
          callback: () => {
            this.thanos.visible = !this.thanos.visible;
            blinkCount++;
            if (blinkCount > 10) {
              this.thanos.visible = true;
              blinkTimer.remove();
            }
          }
        });

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

    if (this.bgFar)  this.bgFar.setDisplaySize(width, height).setPosition(width / 2, height / 2);
    if (this.bgNear) this.bgNear.setDisplaySize(width * 2, height * 2).setPosition(width / 2, height / 2);

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