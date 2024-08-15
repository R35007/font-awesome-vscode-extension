/* eslint-disable @typescript-eslint/naming-convention */
import * as path from "path";
import { TextEncoder } from "util";
import * as vscode from "vscode";
import LocalStorageService from "../LocalStorageService";
import { Settings } from "../Settings";
import { Action, ICONS_VIEW, IconSnippet, WebViewAPIMessage, WebViewAPIMessagePayload } from "../enum.constants.modal";
import { getIcons, getJsxComponentSnippet, getTsxComponentSnippet } from "../utilities";

import getWebView from "./WebView";

let sharp: any;
try {
  sharp = require("sharp");
} catch (err) {
  console.error(err);
}

const ViewType = {
  Staggered: "staggered",
  List: "list",
  Grid: "grid",
};


export class IconsView implements vscode.WebviewViewProvider {
  public static readonly viewType = ICONS_VIEW;

  private _view?: vscode.WebviewView;

  defaultViewState = {
    showOnlyFavoriteIcons: false,
    showIconName: true,
    showIconInfo: true,
    showCategoryBadge: true,
    sortByFeature: true,
    copySnippetAs: "name",
    iconFamily: "all",
    iconCategory: "all",
    iconSize: 25,
    searchText: "",
    matchWholeWord: false,
    viewType: ViewType.Staggered,
    isInverted: false,
  };

  constructor(private readonly _extensionUri: vscode.Uri, private readonly _storage: LocalStorageService, private _icons: IconSnippet[]) { }

  public get viewState() {
    const showOnlyFavoriteIcons = this._storage.getValue("showOnlyFavoriteIcons", this.defaultViewState.showOnlyFavoriteIcons);
    const showIconName = this._storage.getValue("showIconName", this.defaultViewState.showIconInfo);
    const showIconInfo = this._storage.getValue("showIconInfo", this.defaultViewState.showIconInfo);
    const showCategoryBadge = this._storage.getValue("showCategoryBadge", this.defaultViewState.showCategoryBadge);
    const sortByFeature = this._storage.getValue("sortByFeature", this.defaultViewState.sortByFeature);


    const copySnippetAs = this._storage.getValue("copySnippetAs", this.defaultViewState.copySnippetAs);
    const viewType = this._storage.getValue("viewType", this.defaultViewState.viewType);
    const matchWholeWord = this._storage.getValue("matchWholeWord", this.defaultViewState.matchWholeWord);

    const iconFamily = this._storage.getValue("iconFamily", this.defaultViewState.iconFamily);
    const iconCategory = this._storage.getValue("iconCategory", this.defaultViewState.iconCategory);

    const iconSize = this._storage.getValue("iconSize", this.defaultViewState.iconSize);
    const isInverted = this._storage.getValue("isInverted", this.defaultViewState.isInverted);


    const favoriteIcons = this._storage.getValue("favoriteIcons", []);
    const searchText = this._storage.getValue("searchText", this.defaultViewState.searchText);

    const selectedIcon = this._storage.getValue("selectedIcon", showOnlyFavoriteIcons ? favoriteIcons[0] || {} : this._icons[0] || {}) as IconSnippet;

    return {
      showOnlyFavoriteIcons,
      showIconName,
      showIconInfo,
      showCategoryBadge,
      sortByFeature,
      copySnippetAs,
      iconFamily,
      iconCategory,
      iconSize,
      searchText,
      matchWholeWord,
      viewType,
      isInverted,
      selectedIcon,
      favoriteIcons,
    };
  }

  public setViewState(key: string, value: any) {
    this._storage.setValue(key, value)
  }

  public setContext(key: string, value: any) {
    this._storage.setValue(key, value);
    vscode.commands.executeCommand('setContext', key, value);
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    this._view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    this._view.webview.html = getWebView(this._view.webview, this._extensionUri, this._icons, this.viewState);

    this._view.onDidChangeVisibility(() => {
      if (this._view?.visible) {
        this._view.webview.html = getWebView(this._view.webview, this._extensionUri, this._icons, this.viewState);
      }
    });

    this._view.webview.onDidReceiveMessage(this.onDidReceiveMessage);
  }

  private copyIcon({ selectedIcon, copyType }: WebViewAPIMessagePayload) {
    const copyText = selectedIcon[copyType];
    vscode.env.clipboard.writeText(copyText);
    vscode.window.showInformationMessage(`${selectedIcon.label} icon - ${copyType} copied to clipboard 📋`);
  }

  public async saveIcon(selectedIcon: IconSnippet = this.viewState.selectedIcon) {
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
      await vscode.workspace.fs.writeFile(savedPathUri, new TextEncoder().encode(getJsxComponentSnippet(selectedIcon.name, selectedIcon.svg)));
    }

    // Save as .tsx file
    if (extension === ".tsx") {
      await vscode.workspace.fs.writeFile(savedPathUri, new TextEncoder().encode(getTsxComponentSnippet(selectedIcon.name, selectedIcon.svg)));
    }

    await vscode.commands.executeCommand("vscode.open", savedPathUri);
  }

  // On receive any message from webview.
  private onDidReceiveMessage = (data: WebViewAPIMessage) => {
    switch (data.type) {
      case Action.SET_VIEW_STATE: {
        this.setViewState(data.payload.key, data.payload.value);
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

  public async downloadIconArchive() {
    const savedPathUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.parse(`./font-awesome-icons.json`),
      filters: { JSON: ["json"] },
      title: `Save Font Awesome Icons`,
    });

    if (!savedPathUri) return;

    const archive = this._icons
      .filter(icon => this.viewState.iconFamily === 'all' ? true : icon.family.toLowerCase() === this.viewState.iconFamily.toLowerCase())
      .filter(icon => this.viewState.iconCategory === 'all' ? true : icon.categories.find(category => category.toLowerCase() === this.viewState.iconCategory.toLowerCase()));

    await vscode.workspace.fs.writeFile(
      savedPathUri,
      new TextEncoder().encode(JSON.stringify(archive, null, vscode.window.activeTextEditor?.options.tabSize || 2))
    );
    await vscode.commands.executeCommand("vscode.open", savedPathUri);
  }

  public async refreshView() {
    this._icons = this.viewState.showOnlyFavoriteIcons ? this.viewState.favoriteIcons : await getIcons();
    this._view && (this._view.webview.html = getWebView(this._view.webview, this._extensionUri, this._icons, this.viewState));
  }

  public async resetView() {
    this._icons = await getIcons();

    this.setContext("showOnlyFavoriteIcons", false);
    this.setContext("showIconName", true);
    this.setContext("showIconInfo", true);
    this.setContext("showCategoryBadge", true);
    this.setContext("sortByFeature", true);

    Object.entries(this.defaultViewState).forEach(([key, val]) => this.setViewState(key, val));

    this._view && (this._view.webview.html = getWebView(this._view.webview, this._extensionUri, this._icons, this.viewState));
  }

  public menuAction(key: string, value: any) {
    this?._view?.webview.postMessage({ type: key, value });
  }
}
