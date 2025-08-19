import Phaser from "phaser";

const CONFIG = {
  thanos: {
    scale: 1.15,
    yPosition: 420,
    hitEffect: { scaleIncrease: 0.08, tintColor: 0xff0000, duration: 60 },
  },
  attacker: {
    scale: 2,
    attackOffset: 150,
    lightDashDuration: 500,
    animation: { duration: 900, ease: "Power1" },
    heavy: { holdFrameIndex: 2, holdMs: 700, dashDuration: 260 },
  },
  defeatBanner: {
    fontSize: "64px",
    color: "#ffffff",
    stroke: "#000000",
    strokeThickness: 8,
  },
  platforms: {
    width: 220,
    height: 60,
  },
  groundOffsetFromBottom: 270, 
};

// Character registry with exact asset folder names
const CHAR_DEFS = [
  { key: "fighter",       folder: "Fighter" },
  { key: "shinobi",       folder: "Shinobi" },
  { key: "samurai",       folder: "Samurai" },
  { key: "samurai2",      folder: "Samurai2" },
  { key: "samurai3",      folder: "Samurai3" },
  { key: "samuraiArcher", folder: "SamuraiArcher" },
];

export default class ArenaScene extends Phaser.Scene {
  constructor() {
    super("ArenaScene");
    this.isThanosDead = false;

    // backgrounds
    this.bgFar = null;
    this.bgNear = null;

    // thanos + UI
    this.thanos = null;
    this.defeatText = null;

    // attackers map: id -> {...}
    this.attackers = {};
    this.attackerIds = ["TL", "TR", "BL", "BR"];
  }

  preload() {
    // Backgrounds
    this.load.image("background", "assets/background.png");
    this.load.image("background_far", "assets/background_far.png");
    this.load.image("thanos", "assets/thanos.png");

    // platform image (only used for TL/TR)
    this.load.image("platform", "assets/platform.png");

    // Load all character sheets (exact folder names)
    const loadChar = (key, folder) => {
      const base = `assets/avatars/${folder}`;
      this.load.spritesheet(`${key}_idle`,    `${base}/Idle.png`,     { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`${key}_walk`,    `${base}/Walk.png`,     { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`${key}_run`,     `${base}/Run.png`,      { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`${key}_attack1`, `${base}/Attack_1.png`, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`${key}_attack2`, `${base}/Attack_2.png`, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`${key}_attack3`, `${base}/Attack_3.png`, { frameWidth: 128, frameHeight: 128 });
    };
    CHAR_DEFS.forEach(({ key, folder }) => loadChar(key, folder));

    // Sounds
    this.load.audio("sfx_slash",  "assets/Sounds/slash.mp3");
    this.load.audio("sfx_impact", "assets/Sounds/impact.mp3");
    this.load.audio("sfx_change", "assets/Sounds/change.mp3");
  }

  create() {
    const { width, height } = this.cameras.main;
    this.input.setTopOnly(true);

    // Parallax layers
    this.bgFar  = this.add.tileSprite(width / 2, height / 2, width, height, "background_far").setScrollFactor(0);
    this.bgNear = this.add.tileSprite(width / 2, height / 2 + 200, width * 2, height * 2, "background").setScrollFactor(0);

    // Create animations for all character keys once
    this.createAllCharactersAnims();

    // Thanos centered
    this.thanos = this.add
      .image(width / 2, CONFIG.thanos.yPosition, "thanos")
      .setScale(CONFIG.thanos.scale)
      .setDepth(2);

    // Platforms + attackers
    this.createPlatformsAndAttackers();

    // Defeat banner
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

    // Buttons for each attacker (two per attacker)
    this.createPerAttackerButtons();

    this.scale.on("resize", this.resize, this);
  }

  // ---------- animation helpers ----------
  createAnimsFor(prefix) {
    const ensure = (key, sheetKey, frameRate = 12, repeat = -1, framesOverride = null) => {
      if (this.anims.exists(key)) return;
      let frames = framesOverride;
      if (!frames) {
        const tex = this.textures.get(sheetKey);
        const total = tex ? tex.frameTotal : 0;
        const max = Math.max(0, total - 1);
        frames = this.anims.generateFrameNumbers(sheetKey, { start: 0, end: max });
      }
      this.anims.create({ key, frames, frameRate, repeat });
    };

    // normal
    ensure(`${prefix}_idle_anim`,    `${prefix}_idle`,     8,  -1);
    ensure(`${prefix}_walk_anim`,    `${prefix}_walk`,    12,  -1);
    ensure(`${prefix}_run_anim`,     `${prefix}_run`,     16,  -1);
    ensure(`${prefix}_attack1_anim`, `${prefix}_attack1`, 14,   0);
    ensure(`${prefix}_attack2_anim`, `${prefix}_attack2`, 14,   0);
    ensure(`${prefix}_attack3_anim`, `${prefix}_attack3`, 14,   0);

    // reversed walk for right-side idle
    const walkFrames = this.anims.generateFrameNumbers(`${prefix}_walk`);
    const revFrames = walkFrames.slice().reverse();
    ensure(`${prefix}_walk_anim_rev`, `${prefix}_walk`, 12, -1, revFrames);
  }
  createAllCharactersAnims() {
    CHAR_DEFS.forEach(({ key }) => this.createAnimsFor(key));
  }

  // ---------- building scene ----------
  createPlatformsAndAttackers() {
    const { width, height } = this.cameras.main;
    const padX = 160;

    const platformYTop = 220;
    const leftX  = padX;
    const rightX = width - padX;

    // Only TL/TR have platforms. Bottoms stand on ground.
    const centers = {
      TL: { x: leftX,  y: platformYTop },
      TR: { x: rightX, y: platformYTop },
      BL: { x: leftX,  y: this.groundY() },
      BR: { x: rightX, y: this.groundY() },
    };

    // 4 character prefixes
    const chosen = CHAR_DEFS.slice(0, 4).map(c => c.key);

    this.attackerIds.forEach((id, idx) => {
      const prefix = chosen[idx % chosen.length];
      const c = centers[id];

      // Platforms only for TL/TR
      let platformImg = null;
      if (id === "TL" || id === "TR") {
        platformImg = this.add.image(c.x, c.y, "platform")
          .setOrigin(0.5, - 1)
          .setDepth(1);
        const scaleX = CONFIG.platforms.width / platformImg.width;
        const scaleY = CONFIG.platforms.height / platformImg.height;
        platformImg.setScale(scaleX, scaleY);
      }

      // Spawn positions
      const platformHome = { x: c.x, y: (id === "TL" || id === "TR") ? c.y - 40 : c.y }; // TL/TR on top, bottoms on ground
      const groundHome   = { x: c.x, y: this.groundY() };                                 // ground Y aligns BL/BR

      // Create sprite
      const sprite = this.add
        .sprite(platformHome.x, platformHome.y, `${prefix}_idle`, 0)
        .setScale(CONFIG.attacker.scale)
        .setDepth(2)
        .setOrigin(0.5);

      const onRight = id === "TR" || id === "BR";
      sprite.setFlipX(onRight);
      if (onRight) sprite.play(`${prefix}_walk_anim_rev`, true);
      else sprite.play(`${prefix}_walk_anim`, true);

      this.attackers[id] = {
        id,
        prefix,
        sprite,
        busy: false,
        platformImg,      // may be null for BL/BR
        platformHome,     // used by TL/TR
        groundHome,       // all use this to align with BL/BR Y on jump down
        onPlatform: (id === "TL" || id === "TR"), // only tops start on platform
        buttons: { light: null, heavy: null },
      };
    });
  }

  createPerAttackerButtons() {
    const baseY = 70;
    const gapY  = 50;

    const mk = (x, y, label, onClick) => {
      const bg = this.add
        .rectangle(x, y, 88, 36, 0x1f2937, 0.95)
        .setStrokeStyle(2, 0x93c5fd)
        .setScrollFactor(0)
        .setDepth(100)
        .setInteractive({ useHandCursor: true });
      const txt = this.add
        .text(x, y, label, { fontFamily: "sans-serif", fontSize: "14px", color: "#ffffff" })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(101);

      bg.on("pointerover", () => bg.setFillStyle(0x374151, 1));
      bg.on("pointerout",  () => bg.setFillStyle(0x1f2937, 0.95));
      bg.on("pointerdown", () => onClick());
      return { bg, txt };
    };

    const { width } = this.cameras.main;
    const colLeftX  = 80;
    const colRightX = width - 80;

    const slots = {
      TL: { x: colLeftX,  y: baseY + 0 * gapY, label: "TL" },
      TR: { x: colRightX, y: baseY + 0 * gapY, label: "TR" },
      BL: { x: colLeftX,  y: baseY + 2 * gapY, label: "BL" },
      BR: { x: colRightX, y: baseY + 2 * gapY, label: "BR" },
    };

    Object.values(this.attackers).forEach(att => {
      const pos = slots[att.id];
      const l = mk(pos.x - 28, pos.y, `${pos.label} L`, () => this.lightAttack(att.id));
      const h = mk(pos.x + 28, pos.y, `${pos.label} H`, () => this.heavyAttack(att.id));
      att.buttons.light = l;
      att.buttons.heavy = h;
    });
  }

  // ---------- utility ----------
  thanosCenterX() {
    return this.cameras.main.width / 2;
  }
  groundY() {
    return this.cameras.main.height - CONFIG.groundOffsetFromBottom;
  }
  isTopAttacker(id) {
    return id === "TL" || id === "TR";
  }
  isRight(id) {
    return id === "TR" || id === "BR";
  }

  // Jump DOWN from platform to BL/BR Y (ground), with slight forward push toward center
  jumpDownThen(A, afterJump) {
    const sprite = A.sprite;
    const startY = sprite.y;
    const landX  = A.groundHome.x;
    const landY  = A.groundHome.y; // <-- matches BL/BR Y

    // forward push toward center (+ for left, - for right)
    const push = this.isRight(A.id) ? -60 : 60;
    const targetX = landX + push;

    this.tweens.add({ targets: sprite, x: targetX, duration: 600, ease: "Quad.easeOut" });

    this.tweens.add({
      targets: sprite,
      y: landY,
      duration: 600,
      ease: "Quad.easeIn",
      onUpdate: (tw, target) => {
        const t = tw.progress; // 0..1
        const jumpHeight = 160;
        const arc = (1 - (2 * t - 1) ** 2) * jumpHeight; // parabola
        const base = Phaser.Math.Linear(startY, landY, t);
        target.y = base - arc;
      },
      onComplete: () => {
        A.onPlatform = false; // now on ground
        afterJump();
      }
    });
  }

  // Jump UP from ground to platform
  jumpUpToPlatform(A, afterJumpUp) {
    if (!A.platformImg) { if (afterJumpUp) afterJumpUp(); return; } // safety for BL/BR (shouldn't be called)
    const sprite = A.sprite;
    const startY = sprite.y;
    const landX  = A.platformHome.x;
    const landY  = A.platformHome.y;

    this.tweens.add({ targets: sprite, x: landX, duration: 600, ease: "Quad.easeInOut" });

    this.tweens.add({
      targets: sprite,
      y: landY,
      duration: 600,
      ease: "Quad.easeOut",
      onUpdate: (tw, target) => {
        const t = tw.progress;
        const jumpHeight = 160;
        const arc = (1 - (2 * t - 1) ** 2) * jumpHeight;
        const base = Phaser.Math.Linear(startY, landY, t);
        target.y = base - arc;
      },
      onComplete: () => {
        A.onPlatform = true;
        // face OUTWARD after getting back completely
        const faceOut = (A.id === "TL") ? false : true; // TL face left(false), TR face right(true)
        sprite.setFlipX(faceOut);
        // idle walk
        if (this.isRight(A.id)) sprite.play(`${A.prefix}_walk_anim_rev`, true);
        else sprite.play(`${A.prefix}_walk_anim`, true);
        if (afterJumpUp) afterJumpUp();
      }
    });
  }

  // ---------- shared effects ----------
  thanosKnock(px = 24, dur = 120) {
    if (!this.thanos || this.isThanosDead) return;
    const baseX = this.thanosCenterX();
    this.tweens.addCounter({
      from: 0, to: 1, duration: dur, yoyo: true, ease: "Quad.easeOut",
      onUpdate: (tw) => {
        const t = tw.getValue();
        this.thanos.x = baseX + px * t;
      },
      onComplete: () => { this.thanos.x = baseX; }
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

  // ---------- ATTACKS (per attacker) ----------
  lightAttack(id) {
    if (this.isThanosDead) return;
    const A = this.attackers[id];
    if (!A || A.busy) return;
    A.busy = true;

    const runAndStrike = () => {
      const sprite   = A.sprite;
      const prefix   = A.prefix;
      const targetX  = this.thanos.x + (sprite.x < this.thanos.x ? -CONFIG.attacker.attackOffset : CONFIG.attacker.attackOffset);

      // face travel direction
      sprite.setFlipX(sprite.x > this.thanos.x);

      sprite.play(`${prefix}_run_anim`, true);

      this.tweens.add({
        targets: sprite,
        x: targetX,
        duration: CONFIG.attacker.lightDashDuration,
        ease: "Quad.easeOut",
        onComplete: () => {
          const animstr = "attack" + (Math.floor(Math.random() * 3) + 1);
          const attackKey = `${prefix}_${animstr}_anim`;

          sprite.play(attackKey, true);

          this.sound.play("sfx_impact", { volume: 0.7 });
          this.sound.play("sfx_slash",  { volume: 0.6, rate: 1.05 });

          // Impact FX
          this.time.delayedCall(120, () => {
            this.cameras.main.shake(220, 0.006);
            this.thanos.setTint(0xff0000);
            this.time.delayedCall(150, () => { if (!this.isThanosDead) this.thanos.clearTint(); });
            this.thanosKnock(sprite.x < this.thanos.x ? -24 : 24, 120);
          });

          const handleComplete = () => {
            sprite.off(`animationcomplete-${attackKey}`, handleComplete);
            this.returnToStart(A);
          };
          sprite.once(`animationcomplete-${attackKey}`, handleComplete);
        }
      });
    };

    if (this.isTopAttacker(id) && A.onPlatform) {
      this.jumpDownThen(A, runAndStrike);
    } else {
      runAndStrike();
    }
  }

  heavyAttack(id) {
    if (this.isThanosDead) return;
    const A = this.attackers[id];
    if (!A || A.busy) return;
    A.busy = true;

    const doHeavy = () => {
      const sprite   = A.sprite;
      const prefix   = A.prefix;
      const targetX  = this.thanos.x + (sprite.x < this.thanos.x ? -CONFIG.attacker.attackOffset : CONFIG.attacker.attackOffset);

      // face travel direction
      sprite.setFlipX(sprite.x > this.thanos.x);

      const attackKey = `${prefix}_attack1_anim`;
      sprite.play(attackKey, true);

      const anim   = sprite.anims.currentAnim;
      const frames = anim ? anim.frames : [];
      const holdIx = Math.min(CONFIG.attacker.heavy.holdFrameIndex, Math.max(0, frames.length - 1));
      if (frames.length) sprite.anims.pause(frames[holdIx]); 
      else sprite.anims.pause();

      this.time.delayedCall(CONFIG.attacker.heavy.holdMs, () => {
        this.sound.play("sfx_impact", { volume: 0.7 });
        this.sound.play("sfx_slash",  { volume: 0.6, rate: 1.05 });

        this.tweens.add({
          targets: sprite,
          x: targetX,
          duration: CONFIG.attacker.heavy.dashDuration,
          ease: "Quad.easeOut",
          onComplete: () => {
            sprite.anims.resume();

            this.time.delayedCall(120, () => {
              this.cameras.main.flash(60, 255, 255, 255, false);
              this.cameras.main.shake(220, 0.006);

              this.thanos.setTint(0xff0000);
              this.time.delayedCall(150, () => {
                this.thanos.clearTint();
                this.killThanosLikeMario();
              });
            });

            const handleComplete = () => {
              sprite.off(`animationcomplete-${attackKey}`, handleComplete);
              this.returnToStart(A);
            };
            sprite.once(`animationcomplete-${attackKey}`, handleComplete);
          }
        });
      });
    };

    if (this.isTopAttacker(id) && A.onPlatform) {
      this.jumpDownThen(A, doHeavy);
    } else {
      doHeavy();
    }
  }

  returnToStart(A) {
    const sprite = A.sprite;
    const prefix = A.prefix;
    this.tweens.killTweensOf(sprite);

    let targetX, targetY, afterRunBack;

    if (this.isTopAttacker(A.id) && !A.onPlatform) {
      // Top attacker on ground: run back under platform, then jump up, then face outward
      targetX = A.groundHome.x;
      targetY = A.groundHome.y;
      afterRunBack = () => {
        this.jumpUpToPlatform(A, () => {
          A.busy = false;
        });
      };
    } else {
      // Bottom attacker, or already on platform
      const home = A.onPlatform ? A.platformHome : A.groundHome;
      targetX = home.x;
      targetY = home.y;
      afterRunBack = () => {
        // face outward for tops on platform; for bottoms: outward = left on TL/BL, right on TR/BR
        const faceOut =
          (A.id === "TL" || A.id === "BL") ? false : true;
        sprite.setFlipX(faceOut);

        if (this.isRight(A.id)) sprite.play(`${prefix}_walk_anim_rev`, true);
        else sprite.play(`${prefix}_walk_anim`, true);
        A.busy = false;
      };
    }

    // Face toward movement
    const goingLeft = sprite.x > targetX;
    sprite.setFlipX(goingLeft);

    this.tweens.add({
      targets: sprite,
      x: targetX,
      y: targetY,
      duration: CONFIG.attacker.animation.duration,
      ease: CONFIG.attacker.animation.ease,
      onStart: () => sprite.play(`${prefix}_run_anim`, true),
      onComplete: afterRunBack
    });
  }

  // ---------- LOOP & RESIZE ----------
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
      this.thanos.setPosition(width / 2, CONFIG.thanos.yPosition);
    }

    // Only TL/TR platforms repositioned
    const padX = 160;
    const leftX  = padX;
    const rightX = width - padX;
    const platformYTop = 220;

    const centers = {
      TL: { x: leftX,  y: platformYTop },
      TR: { x: rightX, y: platformYTop },
      BL: { x: leftX,  y: this.groundY() },
      BR: { x: rightX, y: this.groundY() },
    };

    Object.values(this.attackers).forEach(A => {
      const c = centers[A.id];
      if (!c) return;

      // Move/rescale platform image if present (TL/TR)
      if (A.platformImg) {
        A.platformImg.setPosition(c.x, c.y);
        const scaleX = CONFIG.platforms.width / A.platformImg.width;
        const scaleY = CONFIG.platforms.height / A.platformImg.height;
        A.platformImg.setScale(scaleX, scaleY);
      }

      // Update homes
      A.platformHome = { x: c.x, y: (A.platformImg ? c.y - 40 : c.y) };
      A.groundHome   = { x: c.x, y: this.groundY() };

      // If not busy, snap to current home (platform for TL/TR if onPlatform, ground otherwise)
      if (!A.busy) {
        const home = A.onPlatform && A.platformImg ? A.platformHome : A.groundHome;
        A.sprite.setPosition(home.x, home.y);

        // idle anim & facing:
        const isRightSide = this.isRight(A.id);
        // If on platform (TL/TR), keep outward; else face center based on side until moved
        if (A.platformImg && A.onPlatform) {
          const faceOut = (A.id === "TR");
          A.sprite.setFlipX(faceOut);
        } else {
          A.sprite.setFlipX(isRightSide);
        }
        if (isRightSide) A.sprite.play(`${A.prefix}_walk_anim_rev`, true);
        else A.sprite.play(`${A.prefix}_walk_anim`, true);
      }
    });

    if (this.defeatText) this.defeatText.setPosition(width / 2, height / 2);

    const colRightY = height - 100;
    
    const colRightX = width - 80;
    const baseY = 70;
    const gapY  = 50;
    const btnPos = {
      TL: { xL: 80 - 28,  xH: 80 + 28,  y: baseY + 0 * gapY },
      TR: { xL: colRightX - 28, xH: colRightX + 28, y: baseY + 0 * gapY },
      BL: { xL: 80 - 28,  xH: 80 + 28,  y: baseY + 2 * gapY },
      BR: { xL: colRightX - 28, xH: colRightX + 28, y: baseY + 2 * gapY },
    };
    Object.values(this.attackers).forEach(A => {
      const p = btnPos[A.id];
      if (!p) return;
      A.buttons.light.bg.setPosition(p.xL, p.y);
      A.buttons.light.txt.setPosition(p.xL, p.y);
      A.buttons.heavy.bg.setPosition(p.xH, p.y);
      A.buttons.heavy.txt.setPosition(p.xH, p.y);
    });
  }
}
