import Phaser from 'phaser';
import { ASSET_KEYS, DEPTHS, GAME_HEIGHT, GAME_WIDTH } from '../shared/constants.js';
import { audio } from '../shared/audio.js';
import { changePlayerName, getBestScorer, getPlayerName, getSharedLeaderboard } from '../shared/storage.js';
import { addImageButton, addPanel, addResponsiveBackdrop, createGround, fadeToScene, fitDisplaySize } from '../shared/ui.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.cameras.main.fadeIn(220, 23, 42, 56);
    this.background = addResponsiveBackdrop(this, ASSET_KEYS.background);
    this.ground = createGround(this, GAME_HEIGHT - 104);

    const logo = this.add.image(GAME_WIDTH / 2, 138, ASSET_KEYS.logo).setDepth(DEPTHS.ui);
    fitDisplaySize(logo, 360, 192);

    this.bird = this.add.image(GAME_WIDTH / 2, 330, ASSET_KEYS.birdIdle).setDepth(DEPTHS.player);
    fitDisplaySize(this.bird, 82, 122);
    this.animateBird();

    this.add.text(GAME_WIDTH / 2, 420, 'BEST SCORE', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '30px',
      color: '#ffffff',
      stroke: '#31566d',
      strokeThickness: 7
    }).setOrigin(0.5).setDepth(DEPTHS.ui);

    this.bestScoreText = this.add.text(GAME_WIDTH / 2, 458, this.getBestScoreLabel(), {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '26px',
      color: '#ffffff',
      stroke: '#31566d',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(DEPTHS.ui);
    this.refreshBestScoreLabel();

    addImageButton(this, GAME_WIDTH / 2, 542, ASSET_KEYS.playButton, () => fadeToScene(this, 'GameScene'), {
      width: 128,
      height: 112
    });
    addImageButton(this, 62, 66, ASSET_KEYS.leaderboardButton, () => fadeToScene(this, 'LeaderboardScene', {
      returnScene: 'MenuScene'
    }), {
      width: 74,
      height: 68
    });
    addImageButton(this, GAME_WIDTH - 62, 66, ASSET_KEYS.settingsButton, () => this.showSettings(), {
      width: 74,
      height: 68
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroySettingsPanel());

    this.input.keyboard?.once('keydown-SPACE', () => {
      audio.unlock();
      fadeToScene(this, 'GameScene');
    });
  }

  update() {
    this.ground.tilePositionX += this.ground.scrollSpeed;
    this.background.x = Math.sin(this.time.now / 4000) * 5 - 5;
  }

  getBestScoreLabel() {
    const bestScorer = getBestScorer();
    return bestScorer ? `${bestScorer.name} ${bestScorer.score}` : 'NO SCORE YET';
  }

  async refreshBestScoreLabel() {
    await getSharedLeaderboard();
    if (this.bestScoreText?.active) {
      this.bestScoreText.setText(this.getBestScoreLabel());
    }
  }

  animateBird() {
    const frames = [ASSET_KEYS.birdIdle, ASSET_KEYS.birdFlap1];
    let index = 0;
    this.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        this.bird.setTexture(frames[index % frames.length]);
        index += 1;
      }
    });
    this.tweens.add({
      targets: this.bird,
      y: this.bird.y + 20,
      angle: 5,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  showSettings() {
    this.destroySettingsPanel();

    this.settingsObjects = [];
    this.settingsObjects.push(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x10202c, 0.3)
      .setDepth(85));
    this.settingsObjects.push(addPanel(this, GAME_WIDTH / 2, 382, 330, 246).setDepth(86));
    this.settingsObjects.push(this.add.text(GAME_WIDTH / 2, 302, 'CHANGE NAME', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '30px',
      color: '#ffffff',
      stroke: '#31566d',
      strokeThickness: 7
    }).setOrigin(0.5).setDepth(90));

    const nameBox = this.add.rectangle(GAME_WIDTH / 2, 378, 224, 42, 0xffffff, 0.94)
      .setStrokeStyle(3, 0x31566d, 0.3)
      .setDepth(90);
    this.settingsObjects.push(nameBox);

    this.settingsObjects.push(this.createTextButton(GAME_WIDTH / 2 - 54, 456, 'OK', () => this.saveSettingsName()));
    this.settingsObjects.push(this.createTextButton(GAME_WIDTH / 2 + 58, 456, 'X', () => this.destroySettingsPanel()));
    this.createSettingsNameInput(nameBox);
  }

  createTextButton(x, y, label, onClick) {
    const container = this.add.container(x, y).setDepth(90);
    const width = label === 'X' ? 58 : 86;
    const height = 48;
    const bg = this.add.graphics();

    bg.fillStyle(label === 'X' ? 0xe9402d : 0x29a9f3, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.lineStyle(4, 0x31566d, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '23px',
      color: '#ffffff',
      stroke: '#31566d',
      strokeThickness: 5
    }).setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      audio.unlock();
      audio.click();
      this.tweens.add({ targets: container, scale: 0.92, duration: 70, yoyo: true });
    });
    container.on('pointerup', onClick);
    return container;
  }

  createSettingsNameInput(nameBox) {
    const input = document.createElement('input');
    input.className = 'player-name-input';
    input.maxLength = 12;
    input.placeholder = 'NAME';
    input.value = getPlayerName();
    input.autocapitalize = 'characters';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.inputMode = 'text';
    document.body.appendChild(input);

    const syncInputBounds = () => {
      const canvasBounds = this.game.canvas.getBoundingClientRect();
      const scaleX = canvasBounds.width / GAME_WIDTH;
      const scaleY = canvasBounds.height / GAME_HEIGHT;
      const boxWidth = nameBox.displayWidth;
      const boxHeight = nameBox.displayHeight;
      input.style.left = `${canvasBounds.left + (nameBox.x - boxWidth / 2) * scaleX}px`;
      input.style.top = `${canvasBounds.top + (nameBox.y - boxHeight / 2) * scaleY}px`;
      input.style.width = `${boxWidth * scaleX}px`;
      input.style.height = `${boxHeight * scaleY}px`;
      input.style.fontSize = `${24 * Math.min(scaleX, scaleY)}px`;
    };

    input.addEventListener('input', () => {
      input.value = input.value
        .replace(/[^\w .-]/g, '')
        .replace(/\s+/g, ' ')
        .toUpperCase()
        .slice(0, 12);
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.saveSettingsName();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.destroySettingsPanel();
      }
    });

    this.settingsNameInput = input;
    this.syncSettingsInputBounds = syncInputBounds;
    window.addEventListener('resize', syncInputBounds);
    syncInputBounds();
    this.time.delayedCall(80, () => input.focus());
  }

  async saveSettingsName() {
    const playerName = await changePlayerName(this.settingsNameInput?.value || '');
    if (!playerName) {
      this.showToast('Enter your name');
      this.settingsNameInput?.focus();
      return;
    }

    this.destroySettingsPanel();
    this.showToast('Name saved');
  }

  destroySettingsPanel() {
    if (this.syncSettingsInputBounds) {
      window.removeEventListener('resize', this.syncSettingsInputBounds);
      this.syncSettingsInputBounds = null;
    }

    this.settingsNameInput?.remove();
    this.settingsNameInput = null;
    this.settingsObjects?.forEach(object => object.destroy());
    this.settingsObjects = [];
  }

  showToast(message) {
    const toast = this.add.text(GAME_WIDTH / 2, 646, 'Sound effects are on', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#264154',
      backgroundColor: 'rgba(255,255,255,0.8)',
      padding: { x: 16, y: 8 }
    }).setText(message).setOrigin(0.5).setDepth(95).setName('settings-toast');

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: toast.y - 16,
      delay: 800,
      duration: 260,
      onComplete: () => toast.destroy()
    });
  }
}
