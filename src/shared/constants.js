export const GAME_WIDTH = 432;
export const GAME_HEIGHT = 768;

export const ASSET_KEYS = {
  background: 'background',
  backgroundSunset: 'background-sunset',
  backgroundNight: 'background-night',
  ground: 'ground',
  logo: 'logo',
  birdIdle: 'bird-idle',
  birdFlap1: 'bird-flap-1',
  birdFlap2: 'bird-flap-2',
  birdFall: 'bird-fall',
  birdDead: 'bird-dead',
  pipeTop: 'pipe-top',
  pipeBottom: 'pipe-bottom',
  playButton: 'button-play',
  retryButton: 'button-retry',
  pauseButton: 'button-pause',
  resumeButton: 'button-resume',
  homeButton: 'button-home',
  settingsButton: 'button-settings',
  leaderboardButton: 'button-leaderboard',
  soundOnButton: 'button-sound-on',
  soundOffButton: 'button-sound-off',
  musicOnButton: 'button-music-on',
  musicOffButton: 'button-music-off',
  shopButton: 'button-shop',
  backButton: 'button-back',
  nextButton: 'button-next',
  closeButton: 'button-close',
  disabledButton: 'button-disabled'
};

export const STORAGE_KEYS = {
  bestScore: 'flappy-lu.v4.best-score',
  leaderboard: 'flappy-lu.v4.leaderboard',
  playerName: 'flappy-lu.v4.player-name'
};

export const DEPTHS = {
  background: 0,
  pipes: 10,
  ground: 20,
  player: 30,
  ui: 40,
  overlay: 60
};
