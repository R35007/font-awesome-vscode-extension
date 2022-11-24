/* eslint-disable @typescript-eslint/naming-convention */
export const REFRESH_VIEW = "font-awesome.refreshView";
export const DOWNLOAD_ARCHIVE = "font-awesome.download";
export const ICONS_VIEW = "font-awesome.icons-view";

export interface PathDetails {
    category: string;
    iconName: string;
    extension: string;
    filePath: string;
    isFile: boolean;
}

export enum Action {
    COPY = "COPY",
    SAVE = "SAVE"
}

export interface WebViewAPIMessagePayload {
    selectedIcon: IconSnippet,
    iconStyle: 'regular' | 'solid' | 'brands',
    selectedIconIndex: number;
    copyType: "unicode" | "html" | "react" | "vue" | "svg" | "base64";
}

export interface WebViewAPIMessage {
    type: Action,
    payload: WebViewAPIMessagePayload;
}

export interface IconSnippet {
    name: string,
    label: string,
    categories: string[],
    keywords: string[],
    objectID: string,
    unicode: string,
    html: string,
    react: string,
    vue: string,
    svg: string,
    base64: string
}

export type IconSets = { [key: string]: IconSnippet[] };