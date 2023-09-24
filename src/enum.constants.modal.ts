/* eslint-disable @typescript-eslint/naming-convention */
export const ICONS_VIEW = "font-awesome.icons-view";

export enum Commands {
    COPY_ICON_AS = "font-awesome.copyAs",
    SAVE_ICON = "font-awesome.saveIcon",
    DOWNLOAD_ARCHIVE = "font-awesome.download",
    REFRESH_VIEW = "font-awesome.refreshView",
    SHOW_ICON_NAME = 'font-awesome.showIconName',
    HIDE_ICON_NAME = 'font-awesome.hideIconName',
    SHOW_ICON_INFO = 'font-awesome.showIconInfo',
    HIDE_ICON_INFO = 'font-awesome.hideIconInfo',
    SHOW_CATEGORY_BADGE = 'font-awesome.showCategoryBadge',
    HIDE_CATEGORY_BADGE = 'font-awesome.hideCategoryBadge',
    SHOW_SORT_BY_FEATURE = 'font-awesome.showSortByFeature',
    HIDE_SORT_BY_FEATURE = 'font-awesome.hideSortByFeature',
    SHOW_SORT_BY_ALPHABETICAL = 'font-awesome.showSortByAlphabetical',
    HIDE_SORT_BY_ALPHABETICAL = 'font-awesome.hideSortByAlphabetical',
}

export interface PathDetails {
    family?: string;
    category?: string;
    iconName?: string;
    extension?: string;
    filePath: string;
    isFile: boolean;
}

export enum Action {
    COPY = "COPY",
    SAVE = "SAVE",
    SET_VIEW_STATE = "SET_VIEW_STATE",
}

export interface WebViewAPIMessagePayload {
    selectedIcon: any,
    copyType: string;
    key: string;
    value: any;
}

export interface WebViewAPIMessage {
    type: Action,
    payload: WebViewAPIMessagePayload;
}

export interface IconSnippet {
    name: string,
    label: string,
    family: string,
    svg: string,
    categories: string[],
    keywords: string[],
    class?: string,
    objectID?: string,
    unicode?: string,
    html?: string,
    react?: string,
    vue?: string,
    base64?: string
}
