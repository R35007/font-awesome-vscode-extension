import * as vscode from 'vscode';

export class Settings {
  static get IconsConfiguration() {
    return vscode.workspace.getConfiguration('font-awesome.settings');
  }
  static getSettings(key: string) {
    return Settings.IconsConfiguration.get(key);
  }
  static setSettings(key: string, val: any, isUser = true) {
    return Settings.IconsConfiguration.update(key, val, isUser);
  }
  static get customIconsFolderPath() {
    return Settings.getSettings('customIconsFolderPath') as string;
  }
  static get customIcons() {
    return Settings.getSettings('customIcons') as string;
  }
}