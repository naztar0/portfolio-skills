import messages from '@/assets/json/messages.json';
import infoIcon from '@/assets/icons/info.svg?raw';
import clickIcon from '@/assets/icons/click.svg?raw';

const info = `
<div style="display: flex; flex-direction: column; align-items: center;">
  ${clickIcon}
  <span style="font-size: 1.2em">Click & Drag</span>
</div>
<div style="display: flex; flex-direction: column; margin-top: 1em;">
  <span>Use the mouse wheel to zoom in and out</span>
  <span>Press <kbd>C</kbd> to toggle camera controls</span>
  <span>Press <kbd>M</kbd> to toggle mute</span>
  <span>Press <kbd>Esc</kbd> to reset the parent object</span>
  <span>Press <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> to move in walking mode</span>
</div>
<div style="display: flex; flex-direction: column; margin-top: 1em; font-size: 0.8em">
  <span>If you have performance issues, try to reduce the size of the browser window.</span>
  <u>Created by Nazar Taran</u>
</div>
`;

export class MessageBox {
  public readonly messageBox: HTMLDivElement;
  public readonly messageBoxText: HTMLDivElement;
  private readonly openButton: HTMLButtonElement;
  private readonly messages: Record<string, string>;
  private showHint = true;
  private showMessages = false;

  constructor() {
    this.messages = { info, ...messages };

    this.messageBox = document.createElement('div');
    this.messageBox.classList.add('message-box');

    this.messageBoxText = document.createElement('div');
    this.messageBoxText.classList.add('message-box-text');
    this.messageBox.appendChild(this.messageBoxText);

    document.body.appendChild(this.messageBox);

    this.openButton = document.createElement('button');
    this.openButton.classList.add('open-message-box');
    this.openButton.innerHTML = infoIcon;
    this.openButton.onclick = () => this.show('info');

    document.body.appendChild(this.openButton);
    this.showMessages = true;
    this.show('info');
  };

  public start() {
    setTimeout(() => {
      this.showMessages = true;
      this.show('info');
    }, 6e3);
  };

  public show(objectName?: string) {
    if (!this.showMessages) {
      return;
    }
    if (!objectName) {
      if (!this.showHint) {
        this.hide();
      }
      return;
    }
    const text = this.messages[objectName];
    this.showHint = objectName === 'info';
    this.messageBoxText.innerHTML = text;
    this.messageBox.classList.add('show');
    this.openButton.classList.remove('show');
  };

  public hide() {
    this.messageBox.classList.remove('show');
    if (this.showMessages) {
      this.openButton.classList.add('show');
    } else {
      this.openButton.classList.remove('show');
    }
  };

  public toggleShowMessages(show?: boolean) {
    this.showMessages = show ?? !this.showMessages;
    if (!this.showMessages) {
      this.hide();
    }
  };
}
