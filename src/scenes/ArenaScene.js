import { getRandomTask } from "../data/dummyData";

const CONFIG = {
  thanos: {
    scale: 0.55,
    yPosition: 450,
    hitEffect: {
      scaleIncrease: 0.08,
      tintColor: 0xff0000,
      duration: 49
    }
  },
  attackers: {
    scale: 3,
    spawnYOffset: 300,
    targetYOffset: -200,
    animation: {
      duration: 700,
      ease: 'Power1'
    }
  }
};

export default class ArenaScene extends Phaser.Scene {
  constructor() {
    super("ArenaScene");
    this.hasHitOnce = false;
  }

  preload() {
    this.load.image("thanos", "assets/thanos.png");

    this.load.spritesheet("orc_attack", "assets/Orc/Orc-Attack01.png", {
      frameWidth: 100,
      frameHeight: 100
    });
    this.load.spritesheet("soldier_attack", "assets/Soldier/Soldier-Attack01.png", {
      frameWidth: 100,
      frameHeight: 100
    });

    this.load.atlas('flares', 'assets/particles/flares.png', 'assets/particles/flares.json');
  }

  create() {
    const centerX = this.cameras.main.width / 2;
    this.createAnimations();

    this.thanos = this.add.image(centerX, CONFIG.thanos.yPosition, "thanos")
      .setScale(CONFIG.thanos.scale);

    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => this.spawnAttacker()
    });

    this.scale.on("resize", this.resize, this);
  }

  createAnimations() {
    this.anims.create({
      key: "orc_attack_anim",
      frames: this.anims.generateFrameNumbers("orc_attack", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "soldier_attack_anim",
      frames: this.anims.generateFrameNumbers("soldier_attack", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    });
  }

  spawnAttacker() {
    const isOrc = Phaser.Math.Between(0, 1) === 0;
    const key = isOrc ? "orc_attack" : "soldier_attack";
    const animKey = isOrc ? "orc_attack_anim" : "soldier_attack_anim";

    const attacker = this.add.sprite(
      Phaser.Math.Between(100, this.scale.width - 100),
      this.scale.height + CONFIG.attackers.spawnYOffset,
      key
    ).setScale(CONFIG.attackers.scale);

    attacker.play(animKey);

    this.tweens.add({
      targets: attacker,
      x: this.thanos.x,
      y: this.thanos.y + Phaser.Math.Between(CONFIG.attackers.targetYOffset, 0),
      duration: CONFIG.attackers.animation.duration,
      ease: CONFIG.attackers.animation.ease,
      onComplete: () => {
        attacker.destroy();
        this.cameras.main.shake(300, 0.01);
        this.hitThanosEffect();

        if (!this.hasHitOnce) {
          this.hasHitOnce = true;
          this.time.delayedCall(1000, () => this.createFireworks());
        }
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
      onComplete: () => this.thanos.clearTint()
    });
  }

  createFireworks() {
    for (let i = 0; i < 10; i++) {
      this.time.delayedCall(i * 200, () => {
        const x = Phaser.Math.Between(100, this.cameras.main.width - 100);
        const y = Phaser.Math.Between(100, this.cameras.main.height / 2);
        this.createFirework(x, y);
      });
    }
  }

  createFirework(x, y) {
    const particles = this.add.particles('flares');

    const emitter = particles.createEmitter({
      frame: ['red', 'yellow', 'green', 'blue'],
      x: x,
      y: y,
      speed: { min: -300, max: 300 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      lifespan: 1000,
      gravityY: 300,
      quantity: 20,
      emitCallback: (particle) => {
        particle.tint = Phaser.Display.Color.RandomRGB().color;
      }
    });

    this.time.delayedCall(1000, () => particles.destroy());
  }

  resize(gameSize) {
    const { width, height } = gameSize;
    this.cameras.resize(width, height);

    if (this.thanos) {
      this.thanos.setPosition(width / 2, CONFIG.thanos.yPosition);
    }
  }
}
