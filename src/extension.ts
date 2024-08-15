import * as vscode from 'vscode';
import { IconsView } from './IconView_Sidebar';
import LocalStorageService from './LocalStorageService';
import { Settings } from './Settings';
import { Commands } from './enum.constants.modal';
import { getIcons } from './utilities';

export async function activate(context: vscode.ExtensionContext) {

    const icons = await getIcons();

    const storage = new LocalStorageService(context.workspaceState);
    const iconsView = new IconsView(context.extensionUri, storage, icons);

    const setContext = (key: string, value: any) => {
        storage.setValue(key, value);
        vscode.commands.executeCommand('setContext', key, value);
    };

    setContext('showOnlyFavoriteIcons', false); // Show all icons by default
    setContext('showIconName', true); // Show Icon name by default
    setContext('showIconInfo', true); // Show Icon Snippet by default
    setContext('showCategoryBadge', true); // Show Category badges by default
    setContext('sortByFeature', true); // Sort by Features by default

    context.subscriptions.push(vscode.commands.registerCommand(Commands.SHOW_ONLY_FAVORITE_ICONS, () => {
        setContext('showOnlyFavoriteIcons', true);
        iconsView.refreshView();
    }));
    context.subscriptions.push(vscode.commands.registerCommand(Commands.SHOW_ALL_ICONS, () => {
        setContext('showOnlyFavoriteIcons', false);
        iconsView.refreshView();
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
    context.subscriptions.push(vscode.commands.registerCommand(Commands.RESET_VIEW, () => iconsView.resetView()));
    context.subscriptions.push(vscode.commands.registerCommand(Commands.DOWNLOAD_ARCHIVE, () => iconsView.downloadIconArchive()));
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(IconsView.viewType, iconsView));

    const snippetTypes: Array<keyof typeof icons[0]> = ["class", "html", "react", "vue", "svg", "base64"];
    const getIconSnippets = (position: vscode.Position, linePrefix: string): vscode.CompletionItem[] => icons.map(icon => snippetTypes.map((type) => {
        const completionItem = new vscode.CompletionItem(`fa:${icon.name}:${icon.family}:${type}`, vscode.CompletionItemKind.Property);
        completionItem.insertText = icon[type] as string;
        completionItem.range = new vscode.Range(
            position.line,
            linePrefix.length - 3,
            position.line,
            position.character
        );
        return completionItem;
    })).flat();

    const snipperLangs = ['javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'svg', 'xml', 'html', 'less', 'scss', 'sass', 'css'];
    context.subscriptions.push(...snipperLangs.map(lang => vscode.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: (document, position) => {
            // get all text until the `position` and check if it reads `fa:`
            const linePrefix = document.lineAt(position).text.slice(0, position.character);
            const completionItems: vscode.CompletionItem[] = [];
            // return if snippet suggestion is set to false or if linePrefix is not fa:
            if (!linePrefix.endsWith("fa:") || !Settings.showSnippetSuggestion) return completionItems;

            return getIconSnippets(position, linePrefix);
        }
    })));
}

// this method is called when your extension is deactivated
export function deactivate() { }
