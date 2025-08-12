import { getRandomTask } from "../data/dummyData";

const CONFIG = {
  thanos: {
    scale: 1.1,
    yPosition: 450,
    xOffset: 300,
    hitEffect: {
      scaleIncrease: 0.08,
      tintColor: 0xff0000,
      duration: 49
    }
  },
  attacker: {
    scale: 2,
    spawnXOffset: 150,
    yPosition: 570,
    attackOffset: 150,
    animation: {
      duration: 500,
      ease: "Power1"
    }
  }
};

export default class ArenaScene extends Phaser.Scene {
  constructor() {
    super("ArenaScene");
  }

  preload() {
    // Backgrounds
    this.load.image("background", "assets/background.png");
    this.load.image("background_far", "assets/background_far.png");

    // Thanos
    this.load.image("thanos", "assets/thanos.png");

    // Fighter (single character)
    this.load.spritesheet("fighter_idle",    "assets/avatars/Fighter/Idle.png",     { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet("fighter_walk",    "assets/avatars/Fighter/Walk.png",     { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet("fighter_run",     "assets/avatars/Fighter/Run.png",      { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet("fighter_attack1", "assets/avatars/Fighter/Attack_1.png", { frameWidth: 128, frameHeight: 128 });

    // (Fireworks removed)
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Parallax background (like your first prompt)
    this.bgFar = this.add
      .tileSprite(width / 2, height / 2, width, height, "background_far")
      .setScrollFactor(0);
    this.bgNear = this.add
      .tileSprite(width / 2, height / 2 + 200 , width*2, height*2, "background")
      .setScrollFactor(0);

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

    // Start walking
    this.attacker.play("fighter_walk_anim");

    // Attack loop
    this.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => this.attackThanos()
    });

    this.scale.on("resize", this.resize, this);
  }

  createAnimations() {
    const loopAnim = (key, spriteKey, rate = 10) => {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(spriteKey),
        frameRate: rate,
        repeat: -1
      });
    };

    const oneShotAnim = (key, spriteKey, rate = 12) => {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(spriteKey),
        frameRate: rate,
        repeat: 0
      });
    };

    loopAnim("fighter_idle_anim", "fighter_idle", 8);
    loopAnim("fighter_walk_anim", "fighter_walk", 10);
    loopAnim("fighter_run_anim", "fighter_run", 20);
    oneShotAnim("fighter_attack_anim", "fighter_attack1", 14);
  }

  attackThanos() {
    const originalX = this.attacker.x;
    const targetX = this.thanos.x - CONFIG.attacker.attackOffset;

    // Run toward Thanos
    this.attacker.play("fighter_run_anim", true);

    this.tweens.add({
      targets: this.attacker,
      x: targetX,
      duration: CONFIG.attacker.animation.duration,
      ease: CONFIG.attacker.animation.ease,
      onComplete: () => {
        // Attack
        this.attacker.play("fighter_attack_anim", true);

        // Screen shake + hit FX
        setTimeout(() => {
          this.cameras.main.shake(200, 0.005);
          this.hitThanosEffect();
          this.attacker.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
          this.tweens.add({
            targets: this.attacker,
            x: originalX,
            duration: CONFIG.attacker.animation.duration,
            ease: CONFIG.attacker.animation.ease,
            onStart: () => this.attacker.play("fighter_run_anim", true),
            onComplete: () => this.attacker.play("fighter_walk_anim", true)
          });
        });
        }, 300);
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
      onComplete: () => {
        this.thanos.clearTint();
      }
    });
  }

  // Fireworks functions removed

  update() {
    // Parallax scroll (both layers)
    if (this.bgFar) this.bgFar.tilePositionX += 0.1;
    if (this.bgNear) this.bgNear.tilePositionX += 0.3;
  }

  resize(gameSize) {
    const { width, height } = gameSize;
    this.cameras.resize(width, height);

    if (this.bgFar) this.bgFar.setDisplaySize(width/3, height/3).setPosition(width / 2, height / 2);
    if (this.bgNear) this.bgNear.setDisplaySize(width/5, height/5).setPosition(width / 2, height / 2);

    if (this.thanos) {
      this.thanos.setPosition(width - CONFIG.thanos.xOffset, CONFIG.thanos.yPosition);
    }
    if (this.attacker) {
      this.attacker.setPosition(CONFIG.attacker.spawnXOffset, CONFIG.attacker.yPosition);
    }
  }
}
