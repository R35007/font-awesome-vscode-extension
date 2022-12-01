import * as fs from "fs";
import * as path from "path";
import { IconSnippet, PathDetails } from './enum.constants.modal';
import { Settings } from './Settings';

import * as vscode from 'vscode';
const potrace = require("potrace");

const brands = require("../icons/brands.json");
const regular = require("../icons/regular.json");
const solid = require("../icons/solid.json");

const getTitleCaseName = (name: string) => {
    const nameChunk = name.replace(/(_|-)suite/gi, " ").replace(/(_|-)/gi, " ").split(/(_|-|\s)/g);
    const titleCaseName = nameChunk
        .map(n => n.charAt(0).toUpperCase() + n.substring(1).toLowerCase()).join(' ');
    return titleCaseName.replace(/\s{2,}/g, " ");
};

export const getStats = (directoryPath: string): PathDetails | undefined => {
    if (fs.existsSync(directoryPath)) {
        const stats = fs.statSync(directoryPath);
        const extension = path.extname(directoryPath);
        const fileName = path.basename(directoryPath, extension);
        const isFile = stats.isFile();

        if (isFile) {

            const dirBaseName = path.basename(path.dirname(directoryPath));
            const customIconsBaseName = path.basename(Settings.customIconsFolderPath);

            const familyName = path.relative(Settings.customIconsFolderPath, path.dirname(directoryPath)).split(path.sep).shift()!;

            const family = familyName !== ".." ? familyName : "";
            const category = [dirBaseName, customIconsBaseName].includes(family) || customIconsBaseName === dirBaseName ? "" : dirBaseName;
            const iconName = fileName;
            return {
                category: getTitleCaseName(category),
                family: getTitleCaseName(family),
                iconName: getTitleCaseName(iconName),
                extension,
                filePath: directoryPath,
                isFile: stats.isFile(),
            };
        }
        return {
            filePath: directoryPath,
            isFile: stats.isFile(),
        };
    }
    return;
};

export const getAllSVGIcons = (directoryPath: string,): PathDetails[] => {
    const stats = getStats(directoryPath);
    if (!stats) {
        return [];
    } else if (stats.isFile) {
        return [".svg", ".png", ".jpg"].includes(stats.extension!) ? [stats] : [];
    } else {
        const files = fs.readdirSync(directoryPath);
        const filesList = files.reduce((res: PathDetails[], file: string) => {
            return res.concat(getAllSVGIcons(`${directoryPath}/${file}`));
        }, []);

        return filesList;
    }
};

const getSVGTextFromSVGFile = (filePath: string): string => {
    const oldFileName = filePath;
    const newFileName = filePath.replace(".svg", ".txt");

    fs.renameSync(oldFileName, newFileName);
    const svgText = fs.readFileSync(newFileName, 'utf8');
    fs.renameSync(newFileName, oldFileName);

    return svgText;
};

const getSVGTextFromImageFile = async (filePath: string): Promise<string> => {
    return new Promise(resolve => {
        potrace.trace(filePath, { color: Settings.fillColor }, (_err: any, svg: any) => resolve(svg || ""));
    });
};

const getCustomIconSetsFromFolder = async (customIconsFolderPath: string = ''): Promise<IconSnippet[]> => {
    try {
        if (!customIconsFolderPath) { return []; };

        const customIcons: IconSnippet[] = [];
        const svgIconPaths = getAllSVGIcons(customIconsFolderPath);

        for (const svgPathDetails of svgIconPaths) {
            const { family, category, iconName, filePath, extension, } = svgPathDetails;

            const svg = extension === ".svg" ? getSVGTextFromSVGFile(filePath) : await getSVGTextFromImageFile(filePath);
            const base64 = svg ? 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64') : "";

            customIcons.push({
                name: iconName!.replace(/\s/g, "-").toLowerCase(),
                label: iconName!,
                svg,
                base64,
                family: family!,
                keywords: [iconName, family, category].filter(Boolean).map(kw => kw?.replace(/\s/g, "-").toLowerCase()) as string[],
                categories: [category].filter(Boolean).map(kw => kw?.replace(/\s/g, "-").toLowerCase()) as string[]
            });
        }
        return customIcons.filter(icon => icon.categories?.length && icon.family);
    } catch (err) {
        console.log(err);
        return [];
    }
};

export const getIcons = async (): Promise<IconSnippet[]> => {
    try {
        const customIcons = Settings.customIcons;
        const customIconsFromFolder = await getCustomIconSetsFromFolder(Settings.customIconsFolderPath);
        const customIconsArchive = Settings.customIconsArchivePath ? await JSON.parse(fs.readFileSync(Settings.customIconsArchivePath, 'utf-8')) : [];

        const icons: IconSnippet[] = [
            ...regular,
            ...solid,
            ...brands,
            ...customIcons,
            ...customIconsFromFolder,
            ...customIconsArchive
        ];

        const uniqueIcons = [...new Map(icons.map(icon => [`${icon.name}-${icon.family}`, icon])).values()];

        return uniqueIcons;
    } catch (err: any) {
        vscode.window.showErrorMessage(err.message);
        return [
            ...regular,
            ...solid,
            ...brands,
        ];
    }
};