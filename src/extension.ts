import * as vscode from 'vscode';
import { IconsView } from './IconsView';
import LocalStorageService from './LocalStorageService';
import { Settings } from './Settings';
import { Commands } from './enum.constants.modal';
import { getIcons } from './utilities';



export async function activate(context: vscode.ExtensionContext) {

    const icons = await getIcons();
    const snippetTypes: Array<keyof typeof icons[0]> = ["class", "html", "react", "vue", "svg", "base64"];

    const iconSnippets: vscode.CompletionItem[] = icons.map(icon => {
        return snippetTypes.map((type) => {
            const completionItem = new vscode.CompletionItem(`fa:${icon.name}:${icon.family}:${type}`, vscode.CompletionItemKind.Property);
            completionItem.insertText = icon[type] as string;
            return completionItem;
        });
    }).flat();

    const storage = new LocalStorageService(context.workspaceState);
    const iconsView = new IconsView(context.extensionUri, storage, icons);

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

    const snipperLangs = ['javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'xml', 'html', 'less', 'scss', 'sass', 'css'];
    context.subscriptions.push(...snipperLangs.map(lang => vscode.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: () => {
            const completionItems: vscode.CompletionItem[] = [];
            // return if snippet suggestion is set to false
            if (!Settings.snippetSuggestion) return completionItems;
            return iconSnippets;
        }
    })));
}

// this method is called when your extension is deactivated
export function deactivate() { }
