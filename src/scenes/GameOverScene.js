import Phaser from 'phaser';
import { ASSET_KEYS, GAME_HEIGHT, GAME_WIDTH } from '../shared/constants.js';
import {
  getBestScore,
  getPlayerName,
  saveBestScore,
  savePlayerName,
  saveSharedLeaderboardScore,
  shouldSavePlayerScore
} from '../shared/storage.js';
import { addImageButton, addPanel, addTitleText, fadeToScene, formatScoreLabel } from '../shared/ui.js';
import { audio } from '../shared/audio.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data) {
    const score = data.score ?? 0;
    const previousBest = getBestScore();
    const playerName = getPlayerName();
    const canSavePlayerScore = shouldSavePlayerScore(score, playerName);
    const best = saveBestScore(score);
    const isNewBest = score > previousBest;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x10202c, 0.28)
      .setDepth(65);
    addPanel(this, GAME_WIDTH / 2, 390, 336, 330);

    addTitleText(this, 276, 'GAME OVER', 38);

    this.add.text(GAME_WIDTH / 2 - 78, 356, formatScoreLabel('SCORE', score), {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '28px',
      color: '#31566d',
      align: 'center'
    }).setOrigin(0.5).setDepth(80);

    this.add.text(GAME_WIDTH / 2 + 78, 356, formatScoreLabel('BEST', best), {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '28px',
      color: '#31566d',
      align: 'center'
    }).setOrigin(0.5).setDepth(80);

    if (isNewBest) {
      const newBest = this.add.text(GAME_WIDTH / 2, 418, 'NEW BEST', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '20px',
        color: '#f6b800',
        stroke: '#ffffff',
        strokeThickness: 4
      }).setOrigin(0.5).setDepth(80);
      this.tweens.add({ targets: newBest, scale: 1.08, duration: 260, yoyo: true, repeat: -1 });
    }

    if (!playerName && score > 0) {
      this.createNameEntry(score);
    } else if (playerName && canSavePlayerScore) {
      this.saveStoredPlayerScore(playerName, score);
    } else {
      this.createActionButtons();
      this.input.keyboard?.once('keydown-SPACE', () => this.restart());
    }

    this.cameras.main.fadeIn(180, 23, 42, 56);
  }

  createNameEntry(score) {
    this.pendingScore = score;

    this.add.text(GAME_WIDTH / 2, 452, 'ENTER NAME', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '19px',
      color: '#31566d',
      align: 'center'
    }).setOrigin(0.5).setDepth(80);

    const nameBox = this.add.rectangle(GAME_WIDTH / 2, 490, 224, 42, 0xffffff, 0.9)
      .setStrokeStyle(3, 0x31566d, 0.3)
      .setDepth(80);

    this.createOkButton(GAME_WIDTH / 2, 560);

    this.createNameInput(nameBox);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyNameInput());
  }

  createOkButton(x, y) {
    const container = this.add.container(x, y).setDepth(80);
    const width = 90;
    const height = 48;
    const bg = this.add.graphics();

    bg.fillStyle(0x29a9f3, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.lineStyle(4, 0x31566d, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.lineStyle(2, 0xffffff, 0.65);
    bg.strokeRoundedRect(-width / 2 + 5, -height / 2 + 5, width - 10, height - 10, 5);

    const label = this.add.text(0, 0, 'OK', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#31566d',
      strokeThickness: 5
    }).setOrigin(0.5);

    container.add([bg, label]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      audio.unlock();
      audio.click();
      this.tweens.add({ targets: container, scale: 0.92, duration: 70, yoyo: true });
    });
    container.on('pointerup', () => this.saveName());
    container.on('pointerover', () => container.setAlpha(0.9));
    container.on('pointerout', () => container.setAlpha(1));
  }

  createActionButtons() {
    addImageButton(this, 114, 496, ASSET_KEYS.retryButton, () => this.restart(), {
      width: 64,
      height: 64
    });
    addImageButton(this, 182, 496, ASSET_KEYS.homeButton, () => this.home(), {
      width: 64,
      height: 64
    });
    addImageButton(this, 250, 496, ASSET_KEYS.leaderboardButton, () => this.leaderboard(), {
      width: 64,
      height: 64
    });
    addImageButton(this, 318, 496, ASSET_KEYS.settingsButton, () => this.settingsToast(), {
      width: 64,
      height: 64
    });
  }

  restart() {
    this.scene.stop('GameScene');
    fadeToScene(this, 'GameScene');
  }

  home() {
    this.scene.stop('GameScene');
    fadeToScene(this, 'MenuScene');
  }

  leaderboard() {
    this.scene.stop('GameScene');
    fadeToScene(this, 'LeaderboardScene', { returnScene: 'MenuScene' });
  }

  createNameInput(nameBox) {
    const input = document.createElement('input');
    input.className = 'player-name-input';
    input.maxLength = 12;
    input.placeholder = 'NAME';
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
        this.saveName();
      }
    });

    this.nameInput = input;
    this.syncNameInputBounds = syncInputBounds;
    window.addEventListener('resize', syncInputBounds);
    syncInputBounds();
    this.time.delayedCall(120, () => input.focus());
  }

  destroyNameInput() {
    if (this.syncNameInputBounds) {
      window.removeEventListener('resize', this.syncNameInputBounds);
      this.syncNameInputBounds = null;
    }

    this.nameInput?.remove();
    this.nameInput = null;
  }

  async saveName() {
    if (this.nameSaved) return;

    const playerName = savePlayerName(this.nameInput?.value || '');
    if (!playerName) {
      this.showToast('Enter your name');
      this.nameInput?.focus();
      return;
    }

    this.nameSaved = true;
    this.destroyNameInput();
    await saveSharedLeaderboardScore(playerName, this.pendingScore);
    fadeToScene(this, 'LeaderboardScene', { returnScene: 'MenuScene' });
  }

  async saveStoredPlayerScore(playerName, score) {
    await saveSharedLeaderboardScore(playerName, score);
    fadeToScene(this, 'LeaderboardScene', { returnScene: 'MenuScene' });
  }

  settingsToast() {
    this.showToast('Sound effects are on');
  }

  pauseToast() {
    this.showToast('Game paused');
  }

  showToast(message) {
    const toast = this.add.text(GAME_WIDTH / 2, 610, 'Sound effects are on', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#264154',
      backgroundColor: 'rgba(255,255,255,0.85)',
      padding: { x: 16, y: 8 }
    }).setText(message).setOrigin(0.5).setDepth(90);

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
