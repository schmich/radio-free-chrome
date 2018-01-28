/*
  - Multiple stations
  - Use YT JS API to play/pause instead of adding/removing iframe
  - User-specified stations (Chrome storage)
  - Context menu: click to visit station's YouTube page
  - Custom live browser action icon (recording/live pip)
  - Chrome command to play/pause
*/

class Radio extends EventEmitter
{
  constructor() {
    super();
    this.frame = document.createElement('iframe');
    this.frame.src = 'https://www.youtube.com/embed/AQBh9soLSkI?autoplay=1';
    this.playing = false;
  }

  toggle() {
    this.playing = !this.playing;
    if (this.playing) {
      document.body.appendChild(this.frame);
      this.emit('playing', true);
    } else {
      document.body.removeChild(this.frame);
      this.emit('playing', false);
    }
  }
}

let radio = new Radio();
radio.on('playing', playing => {
  chrome.browserAction.setBadgeText({ text: playing ? '▶' : '' });
  chrome.browserAction.setTitle({ title: playing ? 'Radio Free Chrome – Live Now' : 'Radio Free Chrome' });
});

chrome.browserAction.onClicked.addListener(() => radio.toggle());
