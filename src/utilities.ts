import * as fs from "fs";
import * as path from "path";
import { IconSets, PathDetails } from './enum.constants.modal';
import { Settings } from './Settings';
const potrace = require("potrace");

const brands = require("../icons/brands.json");
const regular = require("../icons/regular.json");
const solid = require("../icons/solid.json");

const getTitleCaseName = (name: string) => {
    const nameChunk = name.replace(/(_|-)suite/gi, " ").replace(/(_|-)/gi, " ").split(/(_|-|\s)/g);
    const titleCaseName = nameChunk
        .map(n => n.charAt(0).toUpperCase() + n.substr(1).toLowerCase()).join(' ');
    return titleCaseName.replace(/\s{2,}/g, " ");
};

export const getStats = (directoryPath: string): PathDetails | undefined => {
    if (fs.existsSync(directoryPath)) {
        const stats = fs.statSync(directoryPath);
        const extension = path.extname(directoryPath);
        const fileName = path.basename(directoryPath, extension);
        const category = path.basename(path.dirname(directoryPath)) || '';
        const iconName = fileName;
        return {
            category: getTitleCaseName(category),
            iconName: getTitleCaseName(iconName),
            extension,
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
        return [".svg", ".png", ".jpg"].includes(stats.extension) ? [stats] : [];
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

const getCustomIconSetsFromFolder = async (customIconsFolderPath: string = '') => {
    try {
        if (!customIconsFolderPath) { return {}; };

        const customIconSets: any = {};
        const svgIconPaths = getAllSVGIcons(customIconsFolderPath);

        for (const svgPathDetails of svgIconPaths) {
            const { category, iconName, filePath, extension, } = svgPathDetails;

            const svg = extension === ".svg" ? getSVGTextFromSVGFile(filePath) : await getSVGTextFromImageFile(filePath);
            const base64 = svg ? 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64') : "";

            if (customIconSets[category]?.length) {
                customIconSets[category].push({ name: iconName, label: iconName, svg, base64, family: category, keywords: [iconName, category], categories: [] });
            } else {
                customIconSets[category] = [{ name: iconName, label: iconName, svg, base64, family: category, keywords: [iconName, category], categories: [] }];
            }
        }
        return customIconSets;
    } catch (err) {
        console.log(err);
    }
};

export const getIconSets = async (): Promise<IconSets> => {
    const { regular: cRegular = [], solid: cSolid = [], brands: cBrands = [], ...customIcons } = await getCustomIconSetsFromFolder(Settings.customIconsFolderPath);

    const iconsSets: any = {
        regular: [...regular, ...cRegular],
        solid: [...solid, ...cSolid],
        brands: [...brands, ...cBrands],
        ...customIcons
    };

    return iconsSets;
};