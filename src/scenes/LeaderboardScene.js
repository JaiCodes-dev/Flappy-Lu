import Phaser from 'phaser';
import { ASSET_KEYS, DEPTHS, GAME_HEIGHT, GAME_WIDTH } from '../shared/constants.js';
import { getLeaderboard, getSharedLeaderboard } from '../shared/storage.js';
import { addImageButton, addPanel, addResponsiveBackdrop, addTitleText, createGround, fadeToScene } from '../shared/ui.js';

const CONTENT_DEPTH = 82;
const BUTTON_DEPTH = 90;

export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('LeaderboardScene');
  }

  create(data) {
    this.returnScene = data.returnScene ?? 'MenuScene';
    this.cameras.main.fadeIn(180, 23, 42, 56);
    this.background = addResponsiveBackdrop(this, ASSET_KEYS.background);
    this.ground = createGround(this, GAME_HEIGHT - 104, false);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x10202c, 0.22)
      .setDepth(DEPTHS.overlay);
    addPanel(this, GAME_WIDTH / 2, 364, 360, 478);
    addTitleText(this, 166, 'LEADERBOARD', 34);

    this.rowObjects = [];
    this.renderLeaderboard(getLeaderboard());
    getSharedLeaderboard().then(entries => this.renderLeaderboard(entries));

    addImageButton(this, 374, 166, ASSET_KEYS.closeButton, () => this.back(), {
      width: 46,
      height: 46,
      depth: BUTTON_DEPTH
    });

    addImageButton(this, GAME_WIDTH / 2, 610, ASSET_KEYS.backButton, () => this.back(), {
      width: 70,
      height: 70,
      depth: BUTTON_DEPTH
    });

    this.input.keyboard?.once('keydown-ESC', () => this.back());
    this.input.keyboard?.once('keydown-SPACE', () => this.back());
  }

  renderLeaderboard(entries) {
    this.rowObjects.forEach(rowObject => rowObject.destroy());
    this.rowObjects = [];

    if (entries.length === 0) {
      this.rowObjects.push(this.add.text(GAME_WIDTH / 2, 356, 'No scores yet', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '26px',
        color: '#31566d',
        align: 'center'
      }).setOrigin(0.5).setDepth(CONTENT_DEPTH));
    } else {
      entries.forEach((entry, index) => {
        const y = 226 + index * 32;
        const rankColor = index === 0 ? '#f6b800' : '#31566d';

        this.rowObjects.push(this.add.text(74, y, `${index + 1}`, {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '22px',
          color: rankColor
        }).setOrigin(0.5).setDepth(CONTENT_DEPTH));

        this.rowObjects.push(this.add.text(104, y, entry.name.toUpperCase(), {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '21px',
          color: '#31566d'
        }).setOrigin(0, 0.5).setDepth(CONTENT_DEPTH));

        this.rowObjects.push(this.add.text(352, y, String(entry.score), {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '22px',
          color: '#31566d'
        }).setOrigin(1, 0.5).setDepth(CONTENT_DEPTH));
      });
    }
  }

  back() {
    fadeToScene(this, this.returnScene);
  }
}
