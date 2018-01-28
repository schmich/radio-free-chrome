/*
  - Multiple stations
  - Use YT JS API to play/pause instead of adding/removing iframe: https://developers.google.com/youtube/iframe_api_reference
  - User-specified stations (Chrome storage)
  - Context menu: click to visit station's YouTube page
  - Custom live browser action icon (recording/live pip)
  - Desktop notification when station is changed
    - Button to visit video page: player.getVideoUrl
    - Title of stream: player.getVideoData
  - Chrome command to change stations, change volume
  - Volume settings: player.getVolume, player.setVolume
  - Firefox support
*/

class Radio extends EventEmitter
{
  constructor() {
    super();
    this.player = null;
    this.playing = false;
  }

  toggle() {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    this.playing = true;
    if (this.player !== null) {
      this.player.seekTo(this.player.getDuration());
      this.player.playVideo();
    }
  }

  pause() {
    this.playing = false;
    if (this.player !== null) {
      this.player.pauseVideo();
    }
  }

  load() {
    let host = document.createElement('div');
    host.id = 'player';
    document.body.appendChild(host);

    new YT.Player('player', {
      width: '200',
      height: '200',
      videoId: 'AQBh9soLSkI',
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
          this.player = ev.target;
          this.player.setVolume(50);
          if (this.playing) {
            this.player.playVideo();
          }
        },
        onStateChange: ev => {
          const state = ev.target.getPlayerState();
          this.emit('state', ev.target.getPlayerState(), this.player);
        }
      }
    });
  }

  static get unstarted() { return YT.PlayerState.UNSTARTED; }
  static get ended() { return YT.PlayerState.ENDED; }
  static get playing() { return YT.PlayerState.PLAYING; }
  static get paused() { return YT.PlayerState.PAUSED; }
  static get buffering() { return YT.PlayerState.BUFFERING; }
  static get cued() { return YT.PlayerState.CUED; }
}

let radio = new Radio();

radio.on('state', state => {
  let text = '';
  let title = 'Radio Free Chrome';
  if (state === Radio.playing) {
    text = '▶';
    title = 'Radio Free Chrome – Live Now';
  } else if (state === Radio.buffering || state === Radio.unstarted) {
    text = '...';
  }
  chrome.browserAction.setBadgeText({ text });
  chrome.browserAction.setTitle({ title });
});

let notified = false;
radio.on('state', async (state, player) => {
  if (state !== Radio.playing || notified) {
    return;
  }

  notified = true;

  let { title, author } = player.getVideoData();

  let notification = await Notification.create({
    type: 'basic',
    iconUrl: 'full.png',
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
  if (command === 'toggle-radio') {
    radio.toggle();
  }
});

function onYouTubeIframeAPIReady() {
  radio.load();
}

let script = document.createElement('script');
script.src = 'https://www.youtube.com/iframe_api';
document.body.appendChild(script);
