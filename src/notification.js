class Notification extends EventEmitter
{
  static async create(options) {
    if (this.nextId == null) {
      this.nextId = 0;
    }

    let id = 'Notification:' + this.nextId++;
    let notification = await AsyncChrome.notifications.create(id, options);
    return new Notification(id);
  }

  constructor(id) {
    super();
    this.id = id;

    const clicked = notificationId => {
      if (this.id == notificationId) {
        this.emit('click');
      }
    };

    const buttonClicked = (notificationId, buttonIndex) => {
      if (this.id == notificationId) {
        this.emit('button', buttonIndex);
      }
    };

    const closed = notificationId => {
      if (this.id == notificationId) {
        this.emit('close');
        this.removeAllListeners();
        chrome.notifications.onClicked.removeListener(clicked);
        chrome.notifications.onButtonClicked.removeListener(buttonClicked);
        chrome.notifications.onClosed.removeListener(closed);
      }
    };

    chrome.notifications.onClicked.addListener(clicked);
    chrome.notifications.onButtonClicked.addListener(buttonClicked);
    chrome.notifications.onClosed.addListener(closed);
  }

  clear() {
    chrome.notifications.clear(this.id, () => {});
  }
}
