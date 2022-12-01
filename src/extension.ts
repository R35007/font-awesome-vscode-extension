import * as vscode from 'vscode';
import { Commands } from './enum.constants.modal';
import { IconsView } from './IconsView';
import LocalStorageService from './LocalStorageService';



export function activate(context: vscode.ExtensionContext) {

    const storage = new LocalStorageService(context.workspaceState);
    const iconsView = new IconsView(context.extensionUri, storage);

    const setContext = (key: string, value: any) => {
        storage.setValue(key, value);
        vscode.commands.executeCommand('setContext', key, value);
    };

    setContext('showIconName', true); // Show Icon name by default
    setContext('showIconInfo', true); // Show Icon Snippet by default
    setContext('showCategoryBadge', true); // Show Category badges by default
    setContext('sortByFeature', true); // Sort by Features by default

    context.subscriptions.push(vscode.commands.registerCommand(Commands.COPY_ICON_AS, async () => {
        const copyType = await vscode.window.showQuickPick(["name", "class", "html", "react", "vue", "svg", "base64", "unicode"]);
        if (!copyType) return;
        iconsView.menuAction("setCopyType", copyType);
    }));

    context.subscriptions.push(vscode.commands.registerCommand(Commands.SHOW_ICON_NAME, () => {
        setContext('showIconName', true);
        iconsView.menuAction("ToggleIconName", true);
    }));
    context.subscriptions.push(vscode.commands.registerCommand(Commands.HIDE_ICON_NAME, () => {
        setContext('showIconName', false);
        iconsView.menuAction("ToggleIconName", false);
    }));

    context.subscriptions.push(vscode.commands.registerCommand(Commands.SHOW_ICON_INFO, () => {
        setContext('showIconInfo', true);
        iconsView.menuAction("ToggleIconInfo", true);
    }));
    context.subscriptions.push(vscode.commands.registerCommand(Commands.HIDE_ICON_INFO, () => {
        setContext('showIconInfo', false);
        iconsView.menuAction("ToggleIconInfo", false);
    }));

    context.subscriptions.push(vscode.commands.registerCommand(Commands.SHOW_CATEGORY_BADGE, () => {
        setContext('showCategoryBadge', true);
        iconsView.menuAction("ToggleCategoryBadge", true);
    }));
    context.subscriptions.push(vscode.commands.registerCommand(Commands.HIDE_CATEGORY_BADGE, () => {
        setContext('showCategoryBadge', false);
        iconsView.menuAction("ToggleCategoryBadge", false);
    }));


    const sortByFeature = () => {
        setContext('sortByFeature', true);
        storage.setValue("sortType", "feature");
        iconsView.menuAction("ToggleSortByFeature", true);
    };

    const sortByAlphabet = () => {
        setContext('sortByFeature', false);
        storage.setValue("sortType", "alphabet");
        iconsView.menuAction("ToggleSortByFeature", false);
    };

    context.subscriptions.push(vscode.commands.registerCommand(Commands.SHOW_SORT_BY_FEATURE, sortByFeature));
    context.subscriptions.push(vscode.commands.registerCommand(Commands.HIDE_SORT_BY_ALPHABETICAL, sortByFeature));

    context.subscriptions.push(vscode.commands.registerCommand(Commands.HIDE_SORT_BY_FEATURE, sortByAlphabet));
    context.subscriptions.push(vscode.commands.registerCommand(Commands.SHOW_SORT_BY_ALPHABETICAL, sortByAlphabet));


    context.subscriptions.push(vscode.commands.registerCommand(Commands.SAVE_ICON, () => iconsView.saveIcon()));
    context.subscriptions.push(vscode.commands.registerCommand(Commands.REFRESH_VIEW, () => iconsView.refreshView()));
    context.subscriptions.push(vscode.commands.registerCommand(Commands.DOWNLOAD_ARCHIVE, () => iconsView.downloadIconArchive()));
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(IconsView.viewType, iconsView));
}

// this method is called when your extension is deactivated
export function deactivate() { }
