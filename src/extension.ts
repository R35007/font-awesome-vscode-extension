import * as vscode from 'vscode';
import { DOWNLOAD_ARCHIVE, REFRESH_VIEW } from './enum.constants.modal';
import { IconsView } from './IconsView';

let toggled = true;
let value: any;

export function activate(context: vscode.ExtensionContext) {
    const iconsView = new IconsView(context.extensionUri);
    context.subscriptions.push(vscode.commands.registerCommand(REFRESH_VIEW, () => iconsView.refreshView()));
    context.subscriptions.push(vscode.commands.registerCommand(DOWNLOAD_ARCHIVE, () => iconsView.downloadIconArchive()));
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(IconsView.viewType, iconsView));
}

// this method is called when your extension is deactivated
export function deactivate() { }
