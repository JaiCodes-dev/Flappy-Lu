import Phaser from 'phaser';
import { ASSET_KEYS, DEPTHS, GAME_HEIGHT, GAME_WIDTH } from '../shared/constants.js';
import { audio } from '../shared/audio.js';
import { createParticleTexture, createGround, fadeToScene, fitDisplaySize, addImageButton } from '../shared/ui.js';

const BIRD_X = 118;
const PIPE_SPEED = -178;
const GRAVITY = 1120;
const FLAP_VELOCITY = -370;
const PIPE_INTERVAL = 1450;
const PIPE_GAP_START = 200;
const PIPE_GAP_MIN = 150;
const GROUND_HEIGHT = 104;
const GROUND_TOP_Y = GAME_HEIGHT - GROUND_HEIGHT;
const PIPE_SCREEN_OVERLAP = 36;
const BACKGROUND_SCORE_STEP = 20;
const BACKGROUND_SEQUENCE = [
  ASSET_KEYS.background,
  ASSET_KEYS.backgroundSunset,
  ASSET_KEYS.backgroundNight
];

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.cameras.main.fadeIn(180, 23, 42, 56);
    createParticleTexture(this);

    this.isDead = false;
    this.isPaused = false;
    this.score = 0;
    this.pipeCount = 0;
    this.nextPipeAt = 0;
    this.gameOverQueued = false;

    this.backgroundIndex = 0;
    this.background = this.createBackground(BACKGROUND_SEQUENCE[this.backgroundIndex]);

    this.pipes = this.physics.add.group({ allowGravity: false, immovable: true });
    this.ground = createGround(this, GROUND_TOP_Y);
    this.physics.add.existing(this.ground, true);
    this.ground.body.setSize(GAME_WIDTH, GROUND_HEIGHT).setOffset(0, 0);

    this.bird = this.physics.add.sprite(BIRD_X, GAME_HEIGHT * 0.42, ASSET_KEYS.birdIdle)
      .setDepth(DEPTHS.player)
      .setCollideWorldBounds(false);
    fitDisplaySize(this.bird, 66, 98);
    this.bird.body.setGravityY(GRAVITY);
    this.bird.body.setSize(this.bird.width * 0.5, this.bird.height * 0.46, true);

    this.scoreText = this.add.text(GAME_WIDTH / 2, 78, '0', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '58px',
      color: '#ffffff',
      stroke: '#31566d',
      strokeThickness: 8
    }).setOrigin(0.5).setDepth(DEPTHS.ui);

    this.pauseButton = addImageButton(this, GAME_WIDTH - 40, 42, ASSET_KEYS.pauseButton, () => this.togglePause(), {
      width: 46,
      height: 46,
      depth: DEPTHS.ui
    });

    this.physics.add.overlap(this.bird, this.pipes, () => this.die(true));
    this.physics.add.collider(this.bird, this.ground, () => this.onGroundHit());

    this.input.on('pointerdown', pointer => {
      if (pointer.y < 88 && pointer.x > GAME_WIDTH - 84) return;
      this.flap();
    });
    this.input.keyboard?.on('keydown-SPACE', () => this.flap());
    this.input.keyboard?.on('keydown-P', () => this.togglePause());

    this.flap();
  }

  update(time, delta) {
    if (this.isPaused) return;

    this.ground.tilePositionX += this.ground.scrollSpeed;
    this.updateBackgroundPosition(time);

    if (!this.isDead && time >= this.nextPipeAt) {
      this.spawnPipePair();
      this.nextPipeAt = time + PIPE_INTERVAL;
    }

    this.updateBirdAnimation();
    this.updatePipes();

    if (this.isDead && this.bird.y >= GROUND_TOP_Y - this.bird.displayHeight / 2) {
      this.onGroundHit();
    }

    if (!this.isDead && this.bird.y < -40) {
      this.bird.body.velocity.y = 40;
    }
    if (!this.isDead && this.bird.y > GROUND_TOP_Y - 20) {
      this.die(false);
    }

    const rotationTarget = Phaser.Math.Clamp(this.bird.body.velocity.y / 520, -0.55, 1.2);
    this.bird.rotation = Phaser.Math.Linear(this.bird.rotation, rotationTarget, Math.min(1, delta / 120));
  }

  flap() {
    if (this.isDead || this.isPaused) return;
    audio.unlock();
    audio.flap();
    this.bird.setVelocityY(FLAP_VELOCITY);
    this.bird.setTexture(ASSET_KEYS.birdFlap1);
    this.tweens.killTweensOf(this.bird);
    this.bird.setScale(this.bird.scaleX * 1.12, this.bird.scaleY * 0.9);
    this.tweens.add({
      targets: this.bird,
      scaleX: this.bird.scaleX / 1.12,
      scaleY: this.bird.scaleY / 0.9,
      duration: 115,
      ease: 'Back.easeOut'
    });
  }

  spawnPipePair() {
    const difficulty = Math.min(1, this.score / 24);
    const gap = Phaser.Math.Linear(PIPE_GAP_START, PIPE_GAP_MIN, difficulty);
    const pipeWidth = Phaser.Math.Between(78, 96);
    const x = GAME_WIDTH + pipeWidth;
    const pattern = this.pipeCount % 5;
    const minCenter = 188;
    const maxCenter = GAME_HEIGHT - GROUND_HEIGHT - 188;
    const pipeOverscan = 28;

    const gapCenter = {
      0: Phaser.Math.Between(minCenter, maxCenter),
      1: Phaser.Math.Between(minCenter, 282),
      2: Phaser.Math.Between(maxCenter - 92, maxCenter),
      3: Phaser.Math.Between(260, maxCenter - 42),
      4: Phaser.Math.Between(minCenter + 42, maxCenter - 42)
    }[pattern];

    const gapTop = gapCenter - gap / 2;
    const gapBottom = gapCenter + gap / 2;
    const topHeight = gapTop + pipeOverscan + PIPE_SCREEN_OVERLAP;
    const bottomHeight = GROUND_TOP_Y - gapBottom + pipeOverscan;
    const topY = gapTop - topHeight / 2 + pipeOverscan;
    const bottomY = gapBottom + bottomHeight / 2 - pipeOverscan;
    const speed = PIPE_SPEED - Math.floor(this.score * 1.4);

    const top = this.pipes.create(x, topY, ASSET_KEYS.pipeTop);
    const bottom = this.pipes.create(x, bottomY, ASSET_KEYS.pipeBottom);
    top.setFlipY(true);

    [top, bottom].forEach(pipe => {
      pipe.setDepth(DEPTHS.pipes);
      pipe.displayWidth = pipeWidth;
      pipe.body.setVelocityX(speed);
      pipe.body.allowGravity = false;
      pipe.body.immovable = true;
      pipe.body.setSize(pipe.width * 0.82, pipe.height * 0.96, true);
    });
    top.displayHeight = topHeight;
    bottom.displayHeight = bottomHeight;
    top.body.setSize(top.width * 0.82, top.height * 0.96, true);
    bottom.body.setSize(bottom.width * 0.82, bottom.height * 0.96, true);

    top.scored = false;
    top.partner = bottom;
    this.pipeCount += 1;
  }

  updatePipes() {
    this.pipes.children.iterate(pipe => {
      if (!pipe) return;

      if (!this.isDead && pipe.texture.key === ASSET_KEYS.pipeTop && !pipe.scored && pipe.x < BIRD_X - pipe.displayWidth / 2) {
        pipe.scored = true;
        this.addScore();
      }

      if (pipe.x < -130) {
        pipe.destroy();
      }
    });
  }

  updateBirdAnimation() {
    if (this.isDead) {
      this.bird.setTexture(ASSET_KEYS.birdDead);
      return;
    }

    if (this.bird.body.velocity.y > 210) {
      this.bird.setTexture(ASSET_KEYS.birdFall);
      return;
    }

    this.bird.setTexture(ASSET_KEYS.birdFlap1);
  }

  addScore() {
    this.score += 1;
    this.scoreText.setText(String(this.score));
    this.updateBackgroundForScore();
    audio.score();

    this.tweens.add({
      targets: this.scoreText,
      scale: 1.18,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    const popup = this.add.text(BIRD_X + 30, this.bird.y - 44, '+1', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#31566d',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(DEPTHS.ui);

    this.tweens.add({
      targets: popup,
      y: popup.y - 38,
      alpha: 0,
      duration: 450,
      ease: 'Sine.easeOut',
      onComplete: () => popup.destroy()
    });

    const particles = this.add.particles(BIRD_X + 26, this.bird.y, 'score-spark', {
      lifespan: 420,
      speed: { min: 50, max: 145 },
      scale: { start: 0.65, end: 0 },
      alpha: { start: 0.95, end: 0 },
      quantity: 10,
      emitting: false,
      tint: [0xffffff, 0xffe66d, 0x66e3ff]
    }).setDepth(DEPTHS.ui);
    particles.explode(12);
    this.time.delayedCall(500, () => particles.destroy());
  }

  createBackground(textureKey) {
    const background = this.add.image(0, 0, textureKey).setOrigin(0).setDepth(DEPTHS.background);
    const scale = Math.max(GAME_WIDTH / background.width, GAME_HEIGHT / background.height);
    background.setScale(scale).setPosition((GAME_WIDTH - background.width * scale) / 2, 0);
    return background;
  }

  updateBackgroundPosition(time) {
    const x = Math.sin(time / 4500) * 4 - 4;
    this.background.x = x;
    if (this.nextBackground?.active) {
      this.nextBackground.x = x;
    }
  }

  updateBackgroundForScore() {
    const nextIndex = Math.min(
      BACKGROUND_SEQUENCE.length - 1,
      Math.floor(this.score / BACKGROUND_SCORE_STEP)
    );

    if (nextIndex === this.backgroundIndex) return;

    this.backgroundIndex = nextIndex;
    this.changeBackground(BACKGROUND_SEQUENCE[nextIndex]);
  }

  changeBackground(textureKey) {
    this.tweens.killTweensOf([this.background, this.nextBackground].filter(Boolean));
    this.nextBackground?.destroy();

    const previousBackground = this.background;
    this.nextBackground = this.createBackground(textureKey).setAlpha(0);

    this.tweens.add({
      targets: this.nextBackground,
      alpha: 1,
      duration: 650,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        previousBackground.destroy();
        this.background = this.nextBackground;
        this.nextBackground = null;
      }
    });
  }

  die(hitPipe) {
    if (this.isDead) return;
    this.isDead = true;
    audio.hit();
    this.bird.setTexture(ASSET_KEYS.birdDead);
    this.bird.setVelocityY(260);
    this.bird.body.setGravityY(GRAVITY);
    this.ground.scrollSpeed = 0;
    this.pauseButton.disableInteractive().setAlpha(0.45);
    this.pipes.children.iterate(pipe => pipe?.body?.setVelocityX(0));
    this.queueGameOver(hitPipe ? 760 : 360);

    if (hitPipe) {
      this.cameras.main.shake(160, 0.012);
    }
  }

  onGroundHit() {
    if (!this.isDead) {
      this.die(false);
    }

    this.bird.setVelocity(0, 0);
    this.bird.body.setAllowGravity(false);
    this.bird.y = GROUND_TOP_Y - this.bird.displayHeight / 2;
    this.queueGameOver(260);
  }

  queueGameOver(delay) {
    if (!this.gameOverQueued) {
      this.gameOverQueued = true;
      this.time.delayedCall(delay, () => {
        this.physics.world.isPaused = false;
        this.scene.start('GameOverScene', { score: this.score });
      });
    }
  }

  togglePause() {
    if (this.isDead) return;
    this.isPaused = !this.isPaused;
    this.physics.world.isPaused = this.isPaused;
    this.pauseButton.setTexture(this.isPaused ? ASSET_KEYS.resumeButton : ASSET_KEYS.pauseButton);
    this.pauseButton.setAlpha(1);

    if (this.isPaused) {
      this.pauseText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'PAUSED', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '42px',
        color: '#ffffff',
        stroke: '#31566d',
        strokeThickness: 8
      }).setOrigin(0.5).setDepth(DEPTHS.ui);
    } else {
      this.pauseText?.destroy();
    }
  }

  goHome() {
    this.physics.world.isPaused = false;
    fadeToScene(this, 'MenuScene');
  }
}
