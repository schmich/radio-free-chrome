/*
  - User-specified stations (Chrome storage)
  - Context menu
    - Visit current channel's page
    - Nested menu to choose any channel
  - For performance/recall, remember & store channel names after loading
  - Chrome command to change volume
  - Extension settings
    - Volume
    - Channel list
    - Persisted channel titles (localStorage?)
  - Use YouTube user avatars in notifications?
  - Handle offline channels
  - Move source into src, images into src/images
  - Firefox support
*/

class Radio extends EventEmitter
{
  constructor() {
    super();
    this._player = null;
    this._autoPlay = false;
    this._channel = null;
    this._loaded = false;
    this._setState(Radio.paused);
  }

  toggle() {
    if (this._state === Radio.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  play() {
    this._setState(Radio.loading);
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

  get channel() {
    return this._channel;
  }

  set channel(channel) {
    if (channel == this._channel) {
      return;
    }

    this._channel = channel;
    this.emit('channel', channel);

    this._tryCreatePlayer();
    if (this._player) {
      this._player.loadVideoById(channel);
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

  load() {
    if (this._loaded) {
      return;
    }

    let host = document.createElement('div');
    host.id = 'player';
    document.body.appendChild(host);
    this._loaded = true;
    this._tryCreatePlayer();
  }

  static get loading() { return 0; }
  static get playing() { return 1; }
  static get paused() { return 2; }

  _setState(state) {
    if (this._state === state) {
      return;
    }

    this._state = state;
    this.emit('state', state);
  }

  _tryCreatePlayer() {
    if (!this._channel || !this._loaded || this._player) {
      return;
    }

    new YT.Player('player', {
      width: '200',
      height: '200',
      videoId: this._channel,
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
        onError: ev => console.error(ev),
        onReady: ev => this._onReady(ev.target),
        onStateChange: ev => this._onStateChange()
      }
    });
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
        this._setState(Radio.loading);
        break;
      case YT.PlayerState.PLAYING:
        this._setState(Radio.playing);
        break;
      case YT.PlayerState.CUED:
      case YT.PlayerState.ENDED:
      case YT.PlayerState.PAUSED:
      default:
        this._setState(Radio.paused);
    }
  }
}

let channelIndex = 0;
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

let radio = new Radio();
radio.channel = channels[channelIndex];

radio.on('state', state => {
  let text = '';
  let icon = 'action-disabled.png';
  let title = 'Radio Free Chrome';
  if (state === Radio.playing) {
    icon = 'action-enabled.png';
    title = 'Radio Free Chrome – Live Now';
  } else if (state === Radio.loading) {
    text = '...';
  }
  chrome.browserAction.setIcon({ path: icon });
  chrome.browserAction.setBadgeText({ text });
  chrome.browserAction.setTitle({ title });
});

let notified = false;
let notification = null;
let notificationTimeout = null;

radio.on('channel', () => {
  notified = false;

  if (notification) {
    notification.clear();
  }

  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }
});

radio.on('state', state => {
  if (state === Radio.paused && notification) {
    notification.clear();
  }
});

radio.on('state', async state => {
  if (state !== Radio.playing || notified) {
    return;
  }

  notified = true;

  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }

  notificationTimeout = setTimeout(() => { notified = false; }, 60 * 1000);

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
    radio.pause();
    chrome.tabs.create({ url: radio.url }, () => {});
  });
});

chrome.browserAction.onClicked.addListener(() => radio.toggle());
chrome.commands.onCommand.addListener(command => {
  switch (command) {
    case 'radio:toggle':
      radio.toggle();
      break;
    case 'radio:next':
      channelIndex = (channelIndex + 1) % channels.length;
      radio.channel = channels[channelIndex];
      break;
    case 'radio:prev':
      channelIndex = (channelIndex + channels.length - 1) % channels.length;
      radio.channel = channels[channelIndex];
      break;
  }
});

chrome.contextMenus.create({
  title: 'Open Livestream',
  contexts: ['browser_action'],
  onclick: () => {
    radio.pause();
    chrome.tabs.create({ url: radio.url }, () => {});
  }
}, () => {});

function onYouTubeIframeAPIReady() {
  radio.load();
}

let script = document.createElement('script');
script.src = 'https://www.youtube.com/iframe_api';
document.body.appendChild(script);
