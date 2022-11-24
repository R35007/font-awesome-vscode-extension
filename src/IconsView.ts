import { TextEncoder } from 'util';
import * as vscode from 'vscode';
import { Action, IconSets, ICONS_VIEW, WebViewAPIMessage, WebViewAPIMessagePayload } from './enum.constants.modal';
import { getIconSets } from './utilities';
import * as path from "path";
const { convert } = require('convert-svg-to-png');

export class IconsView implements vscode.WebviewViewProvider {
  public static readonly viewType = ICONS_VIEW;

  private _view?: vscode.WebviewView;
  private _iconSets: IconSets = {};

  constructor(
    private readonly _extensionUri: vscode.Uri,
  ) { }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    this._iconSets = await getIconSets();

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview);

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
      }
    });

    webviewView.webview.onDidReceiveMessage(this.onDidReceiveMessage);
  }

  // On receive any message from webview. 
  private onDidReceiveMessage = (data: WebViewAPIMessage) => {
    switch (data.type) {
      case Action.COPY: {
        this.copyIcon(data.payload);
        break;
      }
      case Action.SAVE: {
        this.saveIcon(data.payload);
        break;
      }
    }
  };

  private copyIcon({ copyType, selectedIcon }: WebViewAPIMessagePayload) {
    const copyText = selectedIcon[copyType];
    vscode.env.clipboard.writeText(copyText);
    vscode.window.showInformationMessage(`${selectedIcon.label} Icon - Copied to Clipboard 📋`);
  }

  private async saveIcon({ selectedIcon }: WebViewAPIMessagePayload) {
    const savedPathUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.parse(`./${selectedIcon.name}`),
      filters: { 'Vector': ["svg"], 'Image': ['png'] },
      title: `Save ${selectedIcon.label} (${selectedIcon.name}) icon`,
    });

    if (savedPathUri) {
      const extension = path.extname(savedPathUri.fsPath);

      // Save as .png file
      if (extension === ".png") {
        const png = await convert(selectedIcon.svg, { width: "200px", height: "200px", fill: "#ffffff" });
        await vscode.workspace.fs.writeFile(savedPathUri, png);
      }

      // Save as .svg file
      if (extension === ".svg") {
        await vscode.workspace.fs.writeFile(savedPathUri, new TextEncoder().encode(selectedIcon.svg));
      }

      await vscode.commands.executeCommand("vscode.open", savedPathUri);
    }
  }

  public async refreshView() {
    this._iconSets = await getIconSets();
    this._view && (this._view.webview.html = this._getHtmlForWebview(this._view.webview));
  }

  public async downloadIconArchive() {
    const savedPathUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.parse(`./font-awesome-icons.json`),
      filters: { 'JSON': ["json"] },
      title: `Save Font Awesome Icons`,
    });

    if (savedPathUri) {
      await vscode.workspace.fs.writeFile(savedPathUri, new TextEncoder().encode(JSON.stringify(this._iconSets, null, vscode.window.activeTextEditor?.options.tabSize || 2)));
      await vscode.commands.executeCommand("vscode.open", savedPathUri);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
    // Do the same for the stylesheet.
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, ...['media', 'main.css']));

    // Toolkit Uri
    const toolkitUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        ...['node_modules', '@vscode', 'webview-ui-toolkit', 'dist', 'toolkit.js']
      )
    );

    const categoryOptions = Object.keys(this._iconSets).map(c => (`<vscode-option style="text-transform: capitalize;" value="${c}">${c}</vscode-option>`)).join('');

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data: ; script-src 'nonce-${nonce}';">
        <link href="${styleMainUri}" rel="stylesheet">
        <script type="module" src="${toolkitUri}" nonce="${nonce}"></script>
        <title>Font Awesome</title>
    </head>
    <body>
        <div class="info-container">
            <header class="row">
              <div style="flex:1; font-size: 1rem;">
                <span id="selected-icon-label" style="white-space: nowrap; margin-right: 5px;"><!-- inject selected icon label from script  --></span>
                <span id="selected-icon-name" style="white-space: nowrap; font-size: 0.9rem; opacity: 0.9;"><!-- inject selected icon name from script  --></span>
              </div>
              <vscode-dropdown id="icon-style" style="text-transform: capitalize; margin-top: 5px;" id="icon-style"> 
                <vscode-option style="text-transform: capitalize;" value="all">All</vscode-option>
                ${categoryOptions}
              </vscode-dropdown>
            </header>
            <div class="row m-0" style="justify-content: center; align-items: unset;">
                <div id="selected-icon-image" class="col" title="click here to save icon">
                  <!-- inject selected icon image from script  -->
                </div>
                <div class="col detail-container flex-1" style="font-size: 0.8rem">
                  <div class="row w-100 mb-0">
                    <vscode-panels class="w-100" style="overflow: visible">
                      <vscode-panel-tab id="html-snippet">Html</vscode-panel-tab>
                      <vscode-panel-tab id="react-snippet">React</vscode-panel-tab>
                      <vscode-panel-tab id="vue-snippet">Vue</vscode-panel-tab>
                      <vscode-panel-tab id="svg-snippet">SVG</vscode-panel-tab>
                      <vscode-panel-tab id="base64-snippet">Base64</vscode-panel-tab>
                      <vscode-panel-tab id="unicode-snippet">Unicode</vscode-panel-tab>
                      
                      <vscode-panel-view class="p-0" id="html-snippet-view">
                        <div class="w-100 position-relative">
                          <vscode-text-area readonly class="w-100 h-100" value="" rows=1 id="html-snippet-textarea"></vscode-text-area>
                          <vscode-button class="copy-btn position-absolute end-0 bottom-0" data-copytype="html">copy</vscode-button>
                        </div>
                      </vscode-panel-view>
                      <vscode-panel-view class="p-0" id="react-snippet-view">
                        <div class="w-100 position-relative">
                          <vscode-text-area readonly class="w-100 h-100" value="" rows=1 id="react-snippet-textarea"></vscode-text-area>
                          <vscode-button class="copy-btn position-absolute end-0 bottom-0" data-copytype="react">copy</vscode-button>
                        </div>
                      </vscode-panel-view>
                      <vscode-panel-view class="p-0" id="vue-snippet-view">
                        <div class="w-100 position-relative">
                          <vscode-text-area readonly class="w-100 h-100" value="" rows=1 id="vue-snippet-textarea"></vscode-text-area>
                          <vscode-button class="copy-btn position-absolute end-0 bottom-0" data-copytype="vue">copy</vscode-button>
                        </div>
                      </vscode-panel-view>
                      <vscode-panel-view class="p-0" id="svg-snippet-view">
                        <div class="w-100 position-relative">
                          <vscode-text-area readonly class="w-100 h-100" value="" rows=1 id="svg-snippet-textarea"></vscode-text-area>
                          <vscode-button class="copy-btn position-absolute end-0 bottom-0" data-copytype="svg">copy</vscode-button>
                        </div>
                      </vscode-panel-view>
                      <vscode-panel-view class="p-0" id="base64-snippet-view">
                        <div class="w-100 position-relative">
                          <vscode-text-area readonly class="w-100 h-100" value="" rows=1 id="base64-snippet-textarea"></vscode-text-area>
                          <vscode-button class="copy-btn position-absolute end-0 bottom-0" data-copytype="base64">copy</vscode-button>
                        </div>
                      </vscode-panel-view>
                      <vscode-panel-view class="p-0" id="unicode-snippet-view">
                        <div class="w-100 position-relative">
                          <vscode-text-area readonly class="w-100 h-100" value="" rows=1 id="unicode-snippet-textarea"></vscode-text-area>
                          <vscode-button class="copy-btn position-absolute end-0 bottom-0" data-copytype="unicode">copy</vscode-button>
                        </div>
                      </vscode-panel-view>
                    </vscode-panels>
                  </div>
                </div>
            </div>
            <div class="row" id="selected-icon-categories" style="gap: 8px; margin: 1rem 0;">
              <!-- inject selected icon categories from script  -->
            </div>
            <div class="row">
              <div class="key">Zoom : <span id="icon-size-indicator">20%<span></div>
              <input type="range" min="25" max="60" step="1" value="32" id="icon-size-slider">
            </div>
            <div class="row position-relative">
              <vscode-text-field id="search-icon-textbox" placeholder="Search Icons" class="w-100"></vscode-text-field>
              <span id="total-icons"></span>
            </div>
        </div>
        <ul id="icons-list" class="icons-list">
        </ul>
        <div id="no-icons-found" style="margin: 1rem;"> 
          Please click <a href="https://fontawesome.com/search?m=free&o=r">here</a> to search for more icons
        </div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
        <script nonce="${nonce}">
          init(${JSON.stringify(this._iconSets)});
        </script>
    </body>
    </html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}