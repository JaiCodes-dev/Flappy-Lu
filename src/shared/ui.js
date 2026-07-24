import Phaser from 'phaser';
import { ASSET_KEYS, GAME_WIDTH } from './constants.js';
import { audio } from './audio.js';

export function addImageButton(scene, x, y, texture, onClick, options = {}) {
  const button = scene.add.image(x, y, texture)
    .setInteractive({ useHandCursor: true })
    .setDepth(options.depth ?? 80);

  fitDisplaySize(button, options.width ?? 86, options.height ?? 86);

  button.on('pointerdown', () => {
    audio.unlock();
    audio.click();
    scene.tweens.add({
      targets: button,
      scaleX: button.scaleX * 0.92,
      scaleY: button.scaleY * 0.92,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  });
  button.on('pointerup', onClick);
  button.on('pointerover', () => button.setTint(0xffffdd));
  button.on('pointerout', () => button.clearTint());

  return button;
}

export function addIconButton(scene, x, y, glyph, onClick, options = {}) {
  const radius = options.radius ?? 28;
  const container = scene.add.container(x, y).setDepth(options.depth ?? 80);
  const bg = scene.add.circle(0, 0, radius, 0xffffff, 0.86)
    .setStrokeStyle(3, 0x31465a, 0.25);
  const text = scene.add.text(0, 0, glyph, {
    fontFamily: 'Arial, sans-serif',
    fontSize: `${options.fontSize ?? 26}px`,
    fontStyle: '700',
    color: '#31465a'
  }).setOrigin(0.5);

  container.add([bg, text]);
  container.setSize(radius * 2, radius * 2);
  container.setInteractive({ useHandCursor: true });
  container.on('pointerdown', () => {
    audio.unlock();
    audio.click();
    scene.tweens.add({ targets: container, scale: 0.92, duration: 70, yoyo: true });
  });
  container.on('pointerup', onClick);

  return container;
}

export function fitDisplaySize(image, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  image.setScale(scale);
  return image;
}

export function addTitleText(scene, y, content, size = 46) {
  return scene.add.text(GAME_WIDTH / 2, y, content, {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: `${size}px`,
    color: '#ffffff',
    stroke: '#31566d',
    strokeThickness: 8,
    align: 'center'
  }).setOrigin(0.5).setDepth(80);
}

export function fadeToScene(scene, key, data) {
  scene.cameras.main.fadeOut(250, 23, 42, 56);
  scene.time.delayedCall(250, () => scene.scene.start(key, data));
}

export function createParticleTexture(scene) {
  if (scene.textures.exists('score-spark')) return;

  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(6, 6, 6);
  graphics.generateTexture('score-spark', 12, 12);
  graphics.destroy();
}

export function addResponsiveBackdrop(scene, key) {
  const bg = scene.add.image(0, 0, key).setOrigin(0).setDepth(0);
  const scale = Math.max(scene.scale.width / bg.width, scene.scale.height / bg.height);
  bg.setScale(scale).setPosition((scene.scale.width - bg.width * scale) / 2, 0);
  return bg;
}

export function addPanel(scene, x, y, width, height) {
  const panel = scene.add.graphics().setDepth(70);
  panel.fillStyle(0xffffff, 0.9);
  panel.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
  panel.lineStyle(4, 0x35546a, 0.18);
  panel.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);
  return panel;
}

export function formatScoreLabel(label, value) {
  return `${label}\n${value}`;
}

export function createGround(scene, y, moving = true) {
  const textureKey = 'ground-fill';

  if (!scene.textures.exists(textureKey)) {
    const source = scene.textures.get(ASSET_KEYS.ground).getSourceImage();
    const crop = { x: 68, y: 430, width: 1398, height: 199 };
    const textureWidth = crop.width * 2;
    const textureHeight = 640;
    const canvas = scene.textures.createCanvas(textureKey, textureWidth, textureHeight);
    const context = canvas.getContext();

    context.fillStyle = '#4b2f1e';
    context.fillRect(0, 0, textureWidth, textureHeight);

    [0, crop.width].forEach(x => {
      context.drawImage(source, crop.x, crop.y, crop.width, crop.height, x, 0, crop.width, crop.height);
      context.drawImage(source, crop.x, crop.y, crop.width, crop.height, x, 250, crop.width, crop.height);
      context.drawImage(source, crop.x, crop.y + 64, crop.width, crop.height - 64, x, 132, crop.width, 280);
      context.drawImage(source, crop.x, crop.y + 64, crop.width, crop.height - 64, x, 382, crop.width, 258);
    });

    canvas.refresh();
  }

  const ground = scene.add.tileSprite(-32, y, GAME_WIDTH + 64, 128, textureKey)
    .setOrigin(0, 0)
    .setDepth(20);
  ground.setTileScale(0.22, 0.22);
  ground.scrollSpeed = moving ? 2.8 : 0;
  return ground;
}
