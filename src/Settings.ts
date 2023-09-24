import * as vscode from 'vscode';

export class Settings {
  static get iconsConfiguration() {
    return vscode.workspace.getConfiguration('font-awesome.settings');
  }
  static getSettings(key: string) {
    return Settings.iconsConfiguration.get(key);
  }
  static setSettings(key: string, val: any, isUser = true) {
    return Settings.iconsConfiguration.update(key, val, isUser);
  }
  static get pngDimensions() {
    return Settings.getSettings('pngDimensions') as { width: number, height: number };
  }
  static get fillColor() {
    return Settings.getSettings('fillColor') as string;
  }
  static get pngIconColor() {
    return Settings.getSettings('pngIconColor') as string;
  }
  static get customIconsArchivePath() {
    return Settings.getSettings('customIconsArchivePath') as string;
  }
  static get customIconsFolderPath() {
    return Settings.getSettings('customIconsFolderPath') as string;
  }
  static get customIcons() {
    return Settings.getSettings('customIcons') as string;
  }
  static get snippetSuggestion() {
    return Settings.getSettings('snippetSuggestion') as boolean;
  }
}
