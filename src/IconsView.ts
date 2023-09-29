/* eslint-disable @typescript-eslint/naming-convention */
import * as path from "path";
import { TextEncoder } from "util";
import * as vscode from "vscode";
import LocalStorageService from "./LocalStorageService";
import { Settings } from "./Settings";
import { Action, ICONS_VIEW, IconSnippet, WebViewAPIMessage, WebViewAPIMessagePayload } from "./enum.constants.modal";
import { getIcons, getReactJSComponent, getReactTSComponent } from "./utilities";

let sharp: any;
try {
  sharp = require("sharp");
} catch (err) {
  console.error(err);
}

export class IconsView implements vscode.WebviewViewProvider {
  public static readonly viewType = ICONS_VIEW;

  defaultViewState = {
    showIconName: true,
    showIconInfo: true,
    showCategoryBadge: true,
    sortType: "feature",
    viewType: "CheatSheetStaggered",
    iconFamily: "all",
    iconCategory: "all",
    iconSize: 32,
    zoom: 20,
    searchText: "",
    isInverted: false,
    selectedIcon: {},
  };

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri, private readonly _storage: LocalStorageService, private _icons: IconSnippet[]) { }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

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
      case Action.SET_VIEW_STATE: {
        this._storage.setValue(data.payload.key, data.payload.value);
        break;
      }
      case Action.COPY: {
        this.copyIcon(data.payload);
        break;
      }
      case Action.SAVE: {
        this.saveIcon(data.payload.selectedIcon);
        break;
      }
    }
  };

  private copyIcon({ selectedIcon, copyType }: WebViewAPIMessagePayload) {
    const copyText = selectedIcon[copyType];
    vscode.env.clipboard.writeText(copyText);
    vscode.window.showInformationMessage(`${selectedIcon.label} icon - ${copyType} copied to clipboard 📋`);
  }

  public async saveIcon(selectedIcon: IconSnippet = this._storage.getValue("selectedIcon", this._icons[0])) {
    const savedPathUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.parse(`./${selectedIcon.name}`),
      filters: sharp ? { Vector: ["svg"], Image: ["png"], React: ["jsx", "tsx"] } : { Vector: ["svg"], React: ["jsx", "tsx"] },
      title: `Save ${selectedIcon.label} (${selectedIcon.name}) icon`,
    });

    if (!savedPathUri) return;

    const extension = path.extname(savedPathUri.fsPath);

    // Save as .png file
    if (extension === ".png" && sharp) {
      let iconColor: string | undefined = Settings.pngIconColor;

      if (Settings.pngIconColor === "Prompt") {
        iconColor = await vscode.window.showQuickPick(["Black", "Gray", "White"], {
          title: "Icon Color",
          placeHolder: "Pick a icon color to save",
        });
      }

      if (!iconColor) return;

      const color: any = {
        Black: -100,
        White: 100,
        Gray: 50,
      };

      const png = await sharp(Buffer.from(selectedIcon.svg))
        .resize({
          width: Settings.pngDimensions.width,
          height: Settings.pngDimensions.height,
          fit: "inside",
        })
        .modulate({ lightness: color[iconColor] })
        .png()
        .toBuffer();

      await vscode.workspace.fs.writeFile(savedPathUri, png);
    }

    // Save as .svg file
    if (extension === ".svg") {
      await vscode.workspace.fs.writeFile(savedPathUri, new TextEncoder().encode(selectedIcon.svg));
    }

    // Save as .jsx file
    if (extension === ".jsx") {
      await vscode.workspace.fs.writeFile(savedPathUri, new TextEncoder().encode(getReactJSComponent(selectedIcon.name, selectedIcon.svg)));
    }

    // Save as .tsx file
    if (extension === ".tsx") {
      await vscode.workspace.fs.writeFile(savedPathUri, new TextEncoder().encode(getReactTSComponent(selectedIcon.name, selectedIcon.svg)));
    }

    await vscode.commands.executeCommand("vscode.open", savedPathUri);
  }

  public async downloadIconArchive() {
    const savedPathUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.parse(`./font-awesome-icons.json`),
      filters: { JSON: ["json"] },
      title: `Save Font Awesome Icons`,
    });

    if (savedPathUri) {
      await vscode.workspace.fs.writeFile(
        savedPathUri,
        new TextEncoder().encode(JSON.stringify(this._icons, null, vscode.window.activeTextEditor?.options.tabSize || 2))
      );
      await vscode.commands.executeCommand("vscode.open", savedPathUri);
    }
  }

  public async refreshView() {
    this._icons = await getIcons();
    vscode.commands.executeCommand("setContext", "showIconName", true);
    vscode.commands.executeCommand("setContext", "showIconInfo", true);
    vscode.commands.executeCommand("setContext", "showCategoryBadge", true);
    vscode.commands.executeCommand("setContext", "sortByFeature", true);
    Object.entries(this.defaultViewState).forEach(([key, val]) => this._storage.setValue(key, val));
    this._view && (this._view.webview.html = this._getHtmlForWebview(this._view.webview));
  }

  public getViewState() {
    const showIconName = this._storage.getValue("showIconName", this.defaultViewState.showIconInfo);
    const showIconInfo = this._storage.getValue("showIconInfo", this.defaultViewState.showIconInfo);
    const showCategoryBadge = this._storage.getValue("showCategoryBadge", this.defaultViewState.showCategoryBadge);

    const copyOnClick = Settings.copyOnClick;
    const copySnippetAs = Settings.copySnippetAs;
    const sortType = this._storage.getValue("sortType", this.defaultViewState.sortType);
    const viewType = this._storage.getValue("viewType", this.defaultViewState.viewType);

    const iconFamily = this._storage.getValue("iconFamily", this.defaultViewState.iconFamily);
    const iconCategory = this._storage.getValue("iconCategory", this.defaultViewState.iconCategory);

    const iconSize = this._storage.getValue("iconSize", this.defaultViewState.iconSize);
    const zoom = this._storage.getValue("zoom", this.defaultViewState.zoom);
    const isInverted = this._storage.getValue("isInverted", this.defaultViewState.isInverted);

    const searchText = this._storage.getValue("searchText", this.defaultViewState.searchText);
    const selectedIcon = this._storage.getValue("selectedIcon", this.defaultViewState.selectedIcon);

    return {
      showIconName,
      showIconInfo,
      showCategoryBadge,
      iconFamily,
      iconCategory,
      iconSize,
      copyOnClick,
      zoom,
      isInverted,
      searchText,
      selectedIcon,
      sortType,
      copySnippetAs,
      viewType,
    };
  }

  public menuAction(key: string, value: any) {
    this?._view?.webview.postMessage({ type: key, value });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.js"));
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, ...["media", "main.css"]));

    // Toolkit Uri
    const toolkitUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, ...["node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"])
    );

    const { showIconName, showIconInfo, showCategoryBadge, iconFamily, iconSize, zoom, searchText, copySnippetAs, viewType } =
      this.getViewState();

    const families: string[] = [...new Set(this._icons.map((icon) => icon.family.toLowerCase()).filter(Boolean))];
    const iconFamiliesOptions = ["all", ...families.sort()]
      .map(
        (style) =>
          `<vscode-option ${iconFamily === style ? "selected" : ""
          } style="text-transform: capitalize;" value="${style}">${style}</vscode-option>`
      )
      .join("");

    const copyTypes = ["name", "class", "html", "react", "vue", "svg", "base64", "unicode"];

    const tabsList = copyTypes
      .map(
        (type) =>
          `<vscode-panel-tab data-type="${type}" data-copy-type="${type}" style="text-transform: capitalize;">${type}</vscode-panel-tab>`
      )
      .join("");
    const viewsList = copyTypes
      .map(
        (type) => `
      <vscode-panel-view class="p-0" id="${type}-snippet-view">
          <vscode-text-area readonly class="w-100" value="" rows=1 data-type="${type}" data-copy-type="${type}"></vscode-text-area>
      </vscode-panel-view>
    `
      )
      .join("");

    const cheatSheetIcon =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--! Font Awesome Free 6.2.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2022 Fonticons, Inc. --><path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg>';
    const compactIcon =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--! Font Awesome Free 6.2.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2022 Fonticons, Inc. --><path d="M384 96V224H256V96H384zm0 192V416H256V288H384zM192 224H64V96H192V224zM64 288H192V416H64V288zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64z"/></svg>';
    const cheatSheetStaggeredIcon =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--! Font Awesome Free 6.2.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2022 Fonticons, Inc. --><path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM64 256c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H96c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg>';

    const viewTypeIconMapping: any = {
      CheatSheetStaggered: cheatSheetStaggeredIcon,
      CheatSheet: cheatSheetIcon,
      Compact: compactIcon,
    };

    const viewTypeIcon = viewTypeIconMapping[viewType] || cheatSheetIcon;

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource
      } data: ; script-src 'nonce-${nonce}';">
        <link href="${styleMainUri}" rel="stylesheet">
        <script type="module" src="${toolkitUri}" nonce="${nonce}"></script>
        <title>Font Awesome</title>
    </head>
    <body>
        <div class="info-container">
            <header class="row">
              <div class="icon-name-container">
                <span id="selected-icon-label" style="margin-right: 5px;"><!-- inject selected icon label from script  --></span>
                <span style="font-size: 0.9rem; opacity: 0.9;" title="copy name"><a id="selected-icon-name"><!-- inject selected icon name from script  --></a></span>
              </div>
              <div class="row filters mb-0" style="gap: 1rem; flex-wrap: nowrap; flex: 1;">
                <div class="flex-1">
                  <div style="display: flex; justify-content: space-between;">Style<span id="style-count">${families.length - 1}</span></div>
                  <vscode-dropdown id="icon-family" class="w-100" style="text-transform: capitalize; margin-top: 5px;">
                    ${iconFamiliesOptions}
                  </vscode-dropdown>
                </div>
                <div class="flex-1">
                  <div style="display: flex; justify-content: space-between;">Category<span id="category-count"></span></div>
                  <vscode-dropdown id="icon-category" class="w-100" style="text-transform: capitalize; margin-top: 5px;">
                    <!-- inject categories options from script  -->
                  </vscode-dropdown>
                </div>
              </div>
            </header>
            <div id="icon-info-container" class="row m-0" style="justify-content: center; align-items: end; display: ${showIconInfo ? "flex" : "none"}">
                <div id="selected-icon-image" class="col" title="click here to save icon">
                  <!-- inject selected icon image from script  -->
                </div>
                <div class="col detail-container flex-1" style="font-size: 0.8rem">
                  <div class="row w-100 mb-0 d-flex" style="align-items: end; justify-content: end;">
                    <vscode-panels class="flex-1" style="overflow: visible;">
                      ${tabsList}
                      ${viewsList}
                    </vscode-panels>
                    <vscode-button id="copy-btn" class="copy-btn" data-copy-type="${copySnippetAs}" style=" bottom: 4px; right: 1px; padding: 7px 5px;">Copy</vscode-button>
                  </div>
                </div>
            </div>
            <div class="row" id="selected-icon-categories" style="gap: 8px; margin: 1rem 0; display: ${showCategoryBadge ? "flex" : "none"}">
              <!-- inject selected icon categories from script  -->
            </div>
            <div class="row">
              <div class="key">Zoom : <span id="zoom-percent">${zoom}%<span></div>
              <input type="range" min="25" max="100" step="1" value="${iconSize}" id="icon-size-slider">
            </div>
            <div class="row search-container">
              <div class="row position-relative mb-0 flex-1 d-flex align-items-center">
                <vscode-text-field id="search-icon-textbox" value="${searchText}" placeholder="Search Icons" class="w-100"></vscode-text-field>
                <span id="total-icons"></span>
              </div>
              <vscode-button id="view-toggle-btn" data-current-view="${viewType}" title="Toggle View" style="display: $showIconName ? "block" : "none"}">
                ${viewTypeIcon}
              </vscode-button>
              <vscode-button id="invert-bg" title="Invert Color">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" version="1.1">
                  <path d="M 84.500 26.435 C 57.023 32.866, 36.133 52.242, 27.828 79 C 24.462 89.845, 24.462 110.155, 27.828 121 C 34.164 141.416, 48.707 158.493, 67.422 167.495 C 78.790 172.962, 85.780 174.456, 100 174.456 C 114.247 174.456, 121.208 172.963, 132.668 167.451 C 151.679 158.307, 167.042 139.698, 172.693 118.968 C 175.124 110.051, 175.124 89.949, 172.693 81.032 C 165.870 56.001, 146.329 35.750, 121.500 27.978 C 112.495 25.159, 93.361 24.362, 84.500 26.435 M 100 100 L 100 162 103.951 162 C 110.872 162, 118.241 159.956, 127.726 155.405 C 140.570 149.243, 149.243 140.570, 155.405 127.726 C 160.555 116.992, 162 110.918, 162 100 C 162 89.082, 160.555 83.008, 155.405 72.274 C 151.962 65.097, 149.461 61.530, 144.150 56.219 C 133.486 45.555, 117.057 38.059, 104.250 38.015 L 100 38 100 100" stroke="none" fill="#ffffff" fill-rule="evenodd"/>
                </svg>
              </vscode-button>
            </div>
        </div>
        <ul id="icons-list" class="icons-list">
        </ul>
        <footer style="margin: 1rem">
          <div> 
            Please click <a href="https://fontawesome.com/search?m=free&o=r">here</a> to search for more icons
          </div>
        <footer>
        <script nonce="${nonce}" src="${scriptMainUri}"></script>
        <script nonce="${nonce}">
          setTimeout(() => {
            init(${JSON.stringify(this._icons)}, ${JSON.stringify(this.getViewState())});
          }, 300);
        </script>
    </body>
    </html>`;
  }
}

function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
