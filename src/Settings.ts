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
  static get customIconsFolderPath() {
    return Settings.getSettings('customIconsFolderPath') as string;
  }
  static get customIcons() {
    return Settings.getSettings('customIcons') as string;
  }
  static get pngDimensions() {
    return Settings.getSettings('pngDimensions') as { width: number, height: number };
  }
  static get fillColor() {
    return Settings.getSettings('fillColor') as string;
  }
}