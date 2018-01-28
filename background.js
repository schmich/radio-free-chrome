/*
  - User-specified stations (Chrome storage)
  - Context menu
    - Visit current channel's page
    - Nested menu to choose any channel
  - For performance/recall, remember & store channel names after loading
  - Chrome command to change stations, change volume
  - Volume settings: player.getVolume, player.setVolume
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
    if (this._autoPlay) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    this._setState(Radio.loading);
    this._autoPlay = true;
    if (this._player) {
      this._player.seekTo(this._player.getDuration());
      this._player.playVideo();
    }
  }

  pause() {
    this._autoPlay = false;
    if (this._player) {
      this._player.pauseVideo();
    }
  }

  set channel(channel) {
    if (channel == this._channel) {
      return;
    }

    this._channel = channel;
    this.emit('channel', channel, this._player);

    this._tryCreatePlayer();
    if (this._player) {
      this._player.loadVideoById(channel);
    }
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
    this.emit('state', state, this._player);
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
        onError: ev => {
          console.error(ev);
        },
        onReady: ev => {
          this._player = ev.target;
          this._player.setVolume(50);
          if (this._autoPlay) {
            this._player.playVideo();
          }
        },
        onStateChange: ev => {
          let state = null;
          switch (this._player.getPlayerState()) {
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
    });
  }
}

let channelIndex = 0;
let channels = [
  'AQBh9soLSkI', 'fxn8p26WTR4', '_43TGUnXCZs', 'SsYkibjW_gc', '6xGBpMYed-c',
  '3KR2S3juSqU', 'VQ9i-V2i6W0', '2L9vFNMvIBE', '6rReMbO42uE', 'aKc5bBFNrD0',
  'WlbpdNJwiKE', 'Nkz1ZdFKeMM', 'S3pofZsRbB8', '2atQnvunGCo', 'NofKmH-H76I'
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

radio.on('channel', () => {
  notified = false;
  if (notification) {
    notification.clear();
  }
});

radio.on('state', async (state, player) => {
  if (state !== Radio.playing || notified) {
    return;
  }

  notified = true;

  let { title, author } = player.getVideoData();

  notification = await Notification.create({
    type: 'basic',
    iconUrl: '128.png',
    title: title,
    message: `by ${author}`,
    isClickable: true
  });

  notification.on('click', () => {
    notification.clear();
    radio.pause();
    let url = player.getVideoUrl();
    chrome.tabs.create({ url }, () => {});
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

function onYouTubeIframeAPIReady() {
  radio.load();
}

let script = document.createElement('script');
script.src = 'https://www.youtube.com/iframe_api';
document.body.appendChild(script);
