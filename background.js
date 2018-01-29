/*
  - User-specified stations (Chrome storage)
  - Context menu
    - Visit current channel's page
    - Nested menu to choose any channel
  - For performance/recall, remember & store channel titles after loading
  - Chrome command to change volume
  - Extension settings
    - Volume
    - Channel list (order, existence)
    - Last played channel
    - Persisted channel titles (localStorage?)
  - Browser action should be a small popup window
    - Radio controls: play/pause, next/prev, volume
    - Channel list with titles
    - Link to settings
  - Use YouTube user avatars in notifications?
  - Handle offline channels
  - Handle onError errors:
    - 2: Invalid video ID
    - 5: Error in HTML5 player
    - 100: Video not found
    - 101: Video does not allow embedded players
      e.g. see _43TGUnXCZs
    - 150: Same as 101
  - Move source into src, images into src/images
  - Firefox support
*/

class PlayerError
{
  static get invalidParameter() { return 1; }
  static get internal() { return 2; }
  static get notFound() { return 3; }
  static get cannotEmbed() { return 4; }
  static get unknown() { return 5; }
}

class PlayState
{
  static get loading() { return 0; }
  static get playing() { return 1; }
  static get paused() { return 2; }
}

class Player extends EventEmitter
{
  constructor() {
    super();
    this._player = null;
    this._autoPlay = false;
    this._videoId = null;
    this._loaded = false;
    this._setState(PlayState.paused);

    window.onYouTubeIframeAPIReady = () => this._load();
    let script = window.document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    window.document.body.appendChild(script);
  }

  toggle() {
    if (this._state === PlayState.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  play() {
    this._setState(PlayState.loading);
    this._autoPlay = true;
    if (this._player) {
      this._player.seekTo(Infinity, true);
    }
  }

  pause() {
    this._autoPlay = false;
    if (this._player) {
      this._player.stopVideo();
    }
  }

  get videoId() {
    return this._videoId;
  }

  set videoId(videoId) {
    if (videoId == this._videoId) {
      return;
    }

    this._videoId = videoId;

    this._tryCreatePlayer();
    if (this._player) {
      this._player.loadVideoById(videoId);
    }
  }

  get url() {
    if (!this._player) {
      return null;
    }
    return this._player.getVideoUrl();
  }

  get title() {
    if (!this._player) {
      return null;
    }
    let { title } = this._player.getVideoData();
    return title;
  }

  get user() {
    if (!this._player) {
      return null;
    }
    let { author } = this._player.getVideoData();
    return author;
  }

  _load() {
    if (this._loaded) {
      return;
    }

    let host = document.createElement('div');
    host.id = 'player';
    document.body.appendChild(host);
    this._loaded = true;
    this._tryCreatePlayer();
  }

  _setState(state) {
    if (this._state === state) {
      return;
    }

    this._state = state;
    this.emit('state', state);
  }

  _tryCreatePlayer() {
    if (!this._videoId || !this._loaded || this._player) {
      return;
    }

    new YT.Player('player', {
      width: '200',
      height: '200',
      videoId: this._videoId,
      playerVars: {
        controls: 0,          // No video player control UI.
        fs: 0,                // No fullscreen button.
        disablekb: 1,         // Disable keyboard hotkeys.
        iv_load_policy: 3,    // Do not show video annotations.
        modestbranding: 1,    // Do not show YouTube logo.
        showinfo: 0,          // Do not show video info before video plays.
        cc_load_policy: 0     // Do not load captions.
      },
      events: {
        onError: ev => this._onError(ev),
        onReady: ev => this._onReady(ev.target),
        onStateChange: ev => this._onStateChange()
      }
    });
  }

  _onError(ev) {
    console.error('Player error', ev);
    const error = ({
      2: PlayerError.invalidParameter,
      5: PlayerError.internal,
      100: PlayerError.notFound,
      101: PlayerError.cannotEmbed,
      150: PlayerError.cannotEmbed
    })[ev.data] || PlayerError.unknown;
    this.emit('error', error);
  }

  _onReady(player) {
    this._player = player;
    this._player.setVolume(50);
    if (this._autoPlay) {
      this._player.playVideo();
    }
  }

  _onStateChange() {
    let state = this._player.getPlayerState();
    switch (state) {
      case YT.PlayerState.UNSTARTED:
      case YT.PlayerState.BUFFERING:
        this._setState(PlayState.loading);
        break;
      case YT.PlayerState.PLAYING:
        this._setState(PlayState.playing);
        break;
      case YT.PlayerState.CUED:
      case YT.PlayerState.ENDED:
      case YT.PlayerState.PAUSED:
      default:
        this._setState(PlayState.paused);
    }
  }
}

class Radio extends EventEmitter
{
  constructor(channels) {
    super();

    this.player = new Player();
    this.player.on('state', (...args) => this.emit('state', ...args));
    this.player.on('channel', (...args) => this.emit('channel', ...args));
    this.player.on('error', (...args) => this.emit('error', ...args));

    this.channels = channels;
    this.channelIndex = 0;
    this.player.videoId = this.channels[0];
  }

  nextChannel() {
    this.channelIndex = (this.channelIndex + 1) % this.channels.length;
    let channel = this.channels[this.channelIndex];
    this.player.videoId = channel;
    this.emit('channel', channel);
  }

  previousChannel() {
    this.channelIndex = (this.channelIndex + channels.length - 1) % channels.length;
    let channel = this.channels[this.channelIndex];
    this.player.videoId = channel;
    this.emit('channel', channel);
  }

  toggle() {
    this.player.toggle();
  }

  play() {
    this.player.play();
  }

  pause() {
    this.player.pause();
  }

  get channel() {
    return this.player.videoId;
  }

  set channel(channel) {
    this.player.videoId = channel;
    this.emit('channel', channel);
  }

  get url() {
    return this.player.url;
  }

  get title() {
    return this.player.title;
  }

  get user() {
    return this.player.user;
  }
}

let channels = [
  'fxn8p26WTR4', '_43TGUnXCZs', 'SsYkibjW_gc', '6xGBpMYed-c',
  '3KR2S3juSqU', 'VQ9i-V2i6W0', '2L9vFNMvIBE', '6rReMbO42uE',
  'aKc5bBFNrD0', 'WlbpdNJwiKE', 'Nkz1ZdFKeMM', 'S3pofZsRbB8',
  '2atQnvunGCo', 'NofKmH-H76I', 'p21RWJYGbPU', 'WfVraXyyjZU',
  '3ksvZx4BgD0', 'tzKdhbiTaoA', 'kCziHoCBrug', 'ueupsBPNkSc',
  '0kG8XbRkp1I', 'iTnoKgOk1wo', '8f3tfSSiIWk', 'NuIAYHVeFYs',
  '2ccaHpy5Ewo', 'Wxu9yDI7a6k', 'o35TFk-IULM', 'hUjRuVhJ_4o',
  'z6NUZMeeCdM', 'xcoac7I-J8M', 'K6IXPdMAVfM', 'gmv54pfxk0Q',
  'zr1bVgZ_IY0', 'AQBh9soLSkI'
];

let radio = new Radio(channels);

function openLivestream() {
  chrome.tabs.create({ url: radio.url }, () => {});
  radio.pause();
}

radio.on('state', state => {
  let text = '';
  let icon = 'action-disabled.png';
  let title = 'Radio Free Chrome';
  if (state === PlayState.playing) {
    icon = 'action-enabled.png';
    title = 'Radio Free Chrome – Live Now';
  } else if (state === PlayState.loading) {
    text = '...';
  }
  chrome.browserAction.setIcon({ path: icon });
  chrome.browserAction.setBadgeText({ text });
  chrome.browserAction.setTitle({ title });
});

let notify = true;
let notification = null;
let notificationTimeout = null;

radio.on('error', error => {
  // TODO: Notify user of channel error.
  // TODO: nextChannel is not always correct, sometimes need to go previousChannel. Move into Radio?
  radio.nextChannel();
});

radio.on('channel', () => {
  notify = true;

  if (notification) {
    notification.clear();
  }

  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }
});

radio.on('state', state => {
  if (state === PlayState.paused && notification) {
    notification.clear();
  }
});

radio.on('state', async state => {
  if (state !== PlayState.playing || !notify) {
    return;
  }

  notify = false;

  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }

  notificationTimeout = setTimeout(() => { notify = true; }, 60 * 1000);

  notification = await Notification.create({
    type: 'basic',
    iconUrl: '128.png',
    title: radio.title,
    message: `by ${radio.user}`,
    buttons: [{
      title: 'Open Livestream',
      iconUrl: 'youtube.png'
    }]
  });

  notification.on('button', () => {
    notification.clear();
    openLivestream();
  });
});

chrome.browserAction.onClicked.addListener(() => radio.toggle());
chrome.commands.onCommand.addListener(command => {
  switch (command) {
    case 'radio:toggle':
      radio.toggle();
      break;
    case 'radio:next':
      radio.nextChannel();
      break;
    case 'radio:prev':
      radio.previousChannel();
      break;
  }
});

chrome.contextMenus.create({
  title: 'Open Livestream',
  contexts: ['browser_action'],
  onclick: openLivestream
}, () => {});
