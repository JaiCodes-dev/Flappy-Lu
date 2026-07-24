import Phaser from 'phaser';
import { ASSET_KEYS, GAME_HEIGHT, GAME_WIDTH } from '../shared/constants.js';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    const barWidth = 270;
    const x = (GAME_WIDTH - barWidth) / 2;
    const y = GAME_HEIGHT / 2;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x6fc8df);
    this.add.text(GAME_WIDTH / 2, y - 44, 'Loading Flappy Lu', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '26px',
      color: '#ffffff',
      stroke: '#31566d',
      strokeThickness: 5
    }).setOrigin(0.5);

    const track = this.add.rectangle(x, y, barWidth, 16, 0xffffff, 0.35).setOrigin(0, 0.5);
    const fill = this.add.rectangle(x, y, 0, 16, 0xffffff, 0.95).setOrigin(0, 0.5);
    track.setStrokeStyle(2, 0x31566d, 0.35);
    this.load.on('progress', value => fill.width = barWidth * value);

    this.load.image(ASSET_KEYS.background, 'assets/Background/background.png');
    this.load.image(ASSET_KEYS.backgroundSunset, 'assets/Background/sunset.png');
    this.load.image(ASSET_KEYS.backgroundNight, 'assets/Background/night.png');
    this.load.image(ASSET_KEYS.ground, 'assets/Ground/ground.png');
    this.load.image(ASSET_KEYS.logo, 'assets/Logo/Logo.png');
    this.load.image(ASSET_KEYS.birdIdle, 'assets/Character/01_flying.png');
    this.load.image(ASSET_KEYS.birdFlap1, 'assets/Character/01_flying.png');
    this.load.image(ASSET_KEYS.birdFlap2, 'assets/Character/01_flying.png');
    this.load.image(ASSET_KEYS.birdFall, 'assets/Character/02_falling.png');
    this.load.image(ASSET_KEYS.birdDead, 'assets/Character/03_dead.png');
    this.load.image(ASSET_KEYS.pipeTop, 'assets/Pipe/pipe_new.png');
    this.load.image(ASSET_KEYS.pipeBottom, 'assets/Pipe/pipe_new.png');
    this.load.image(ASSET_KEYS.playButton, 'assets/Buttons/01_play.png');
    this.load.image(ASSET_KEYS.retryButton, 'assets/Buttons/02_retry.png');
    this.load.image(ASSET_KEYS.homeButton, 'assets/Buttons/03_home.png');
    this.load.image(ASSET_KEYS.pauseButton, 'assets/Buttons/04_pause.png');
    this.load.image(ASSET_KEYS.resumeButton, 'assets/Buttons/05_resume.png');
    this.load.image(ASSET_KEYS.settingsButton, 'assets/Buttons/06_settings.png');
    this.load.image(ASSET_KEYS.leaderboardButton, 'assets/Buttons/07_leaderboard.png');
    this.load.image(ASSET_KEYS.soundOnButton, 'assets/Buttons/08_sound_on.png');
    this.load.image(ASSET_KEYS.soundOffButton, 'assets/Buttons/09_sound_off.png');
    this.load.image(ASSET_KEYS.musicOnButton, 'assets/Buttons/10_music_on.png');
    this.load.image(ASSET_KEYS.musicOffButton, 'assets/Buttons/11_music_off.png');
    this.load.image(ASSET_KEYS.shopButton, 'assets/Buttons/12_shop.png');
    this.load.image(ASSET_KEYS.backButton, 'assets/Buttons/15_close.png');
    this.load.image(ASSET_KEYS.nextButton, 'assets/Buttons/13_back.png');
    this.load.image(ASSET_KEYS.closeButton, 'assets/Buttons/14_next.png');
    this.load.image(ASSET_KEYS.disabledButton, 'assets/Buttons/16_disabled.png');
  }

  create() {
    this.scene.start('MenuScene');
  }
}
