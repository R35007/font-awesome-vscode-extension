import * as fs from "fs";
import * as path from "path";
import { Settings } from "./Settings";
import { IconSnippet, PathDetails } from "./enum.constants.modal";

import * as vscode from "vscode";

// This may throw an error in mac.
let potrace: any;
try {
  potrace = require("potrace");
} catch (err) {
  console.error(err);
}

const brands = require("../icons/brands.json");
const regular = require("../icons/regular.json");
const solid = require("../icons/solid.json");
const light = require("../icons/light.json");

export const toTitleCaseName = (name: string) => {
  const nameChunk = name
    .replace(/(_|-)suite/gi, " ")
    .replace(/(_|-)/gi, " ")
    .split(/(_|-|\s)/g);
  const titleCaseName = nameChunk.map((n) => n.charAt(0).toUpperCase() + n.substring(1).toLowerCase()).join(" ");
  return titleCaseName.replace(/\s{2,}/g, " ");
};

export const toAlphaNumericCase = (input: string = "") =>
  input
    .trim()
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const toComponentNameCase = (name: string) => {
  return toAlphaNumericCase(toTitleCaseName(name).replace(/^[^a-zA-Z]+/, '')).replace(/\s/g, "");
};

export const getJsxComponentSnippet = (iconName: string, svg: string) => `export function ${toComponentNameCase(iconName)}Icon (props) {
  return (
    ${svg.replace("<svg", "<svg {...props} ")}
  )
}`;

export const getTsxComponentSnippet = (iconName: string, svg: string) => `import type { SVGProps } from "react";

export function ${toComponentNameCase(iconName)}Icon (props: SVGProps<SVGSVGElement>) {
return (
  ${svg.replace("<svg", "<svg {...props} ")}
  )
}`;


export const getStats = (directoryPath: string, rootFolderPath: string): PathDetails | undefined => {
  if (fs.existsSync(directoryPath)) {
    const stats = fs.statSync(directoryPath);
    const extension = path.extname(directoryPath);
    const fileName = path.basename(directoryPath, extension);
    const isFile = stats.isFile();

    if (isFile) {
      const dirBaseName = path.basename(path.dirname(directoryPath));
      const customIconsBaseName = path.basename(rootFolderPath);

      const familyName = path.relative(rootFolderPath, path.dirname(directoryPath)).split(path.sep).shift()!;

      const family = familyName !== ".." ? familyName : "";
      const category = [dirBaseName, customIconsBaseName].includes(family) || customIconsBaseName === dirBaseName ? "" : dirBaseName;
      const iconName = fileName;
      return {
        category: toTitleCaseName(category).toLowerCase(),
        family: toTitleCaseName(family).toLowerCase(),
        iconName: toTitleCaseName(iconName),
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

export const getAllSVGIcons = (directoryPath: string, rootFolderPath = directoryPath): PathDetails[] => {
  const stats = getStats(directoryPath, rootFolderPath);
  if (!stats) {
    return [];
  } else if (stats.isFile) {
    return [".svg", ".png", ".jpg"].includes(stats.extension!) ? [stats] : [];
  } else {
    const files = fs.readdirSync(directoryPath);
    const filesList = files.reduce((res: PathDetails[], file: string) => {
      return res.concat(getAllSVGIcons(`${directoryPath}/${file}`, rootFolderPath));
    }, []);

    return filesList;
  }
};

const getSVGTextFromSVGFile = (filePath: string): string => {
  const oldFileName = filePath;
  const newFileName = filePath.replace(".svg", ".txt");

  fs.renameSync(oldFileName, newFileName);
  const svgText = fs.readFileSync(newFileName, "utf8");
  fs.renameSync(newFileName, oldFileName);

  return svgText;
};

const getSVGTextFromImageFile = async (filePath: string): Promise<string> => {
  return new Promise((resolve) => {
    potrace?.trace(filePath, { color: Settings.fillColor }, (_err: any, svg: any) => resolve(svg || ""));
  });
};

const getCustomIconSetsFromFolder = async (customIconsFolderPath: string = ""): Promise<IconSnippet[]> => {
  try {
    if (!customIconsFolderPath) {
      return [];
    }

    const customIcons: IconSnippet[] = [];
    const svgIconPaths = getAllSVGIcons(customIconsFolderPath);

    for (const svgPathDetails of svgIconPaths) {
      const { family, category, iconName, filePath, extension } = svgPathDetails;

      const svg = extension !== ".svg" && potrace ? await getSVGTextFromImageFile(filePath) : getSVGTextFromSVGFile(filePath);
      const base64 = svg ? "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64") : "";

      customIcons.push({
        name: iconName!.replace(/\s/g, "-").toLowerCase(),
        label: iconName!,
        svg,
        base64,
        family: family || "others",
        keywords: [iconName, family, category].filter(Boolean).map((kw) => kw?.replace(/\s/g, "-").toLowerCase()) as string[],
        categories: [category || "others"].filter(Boolean).map((kw) => kw?.replace(/\s/g, "-").toLowerCase()) as string[],
      });
    }
    return customIcons;
  } catch (err) {
    console.log(err);
    return [];
  }
};

export const getIcons = async (): Promise<IconSnippet[]> => {
  try {
    const customIcons = Settings.customIcons;
    const customIconsFromFolder = (await Promise.all(([] as string[]).concat(Settings.customIconsFolderPaths).map(getCustomIconSetsFromFolder))).flat();
    const customIconsArchive = ([] as string[]).concat(Settings.customIconsArchivePaths).map((iconArchiveJsonPath) => JSON.parse(fs.readFileSync(iconArchiveJsonPath, "utf-8"))).flat();

    const icons: IconSnippet[] = [...regular, ...solid, ...light, ...brands, ...customIcons, ...customIconsFromFolder, ...customIconsArchive];

    const uniqueIcons = [...new Map(icons.map((icon) => [`${icon.name}-${icon.family}`, icon])).values()];

    return uniqueIcons.map(icon => ({
      ...icon,
      categories: icon.categories.length ? icon.categories : ["others"],
      keywords: icon.keywords.length ? icon.keywords : [icon.name, "others"],
      react: icon.react ?? `<${toComponentNameCase(icon.name!)} />`,
      tsx: icon.tsx ?? getTsxComponentSnippet(icon.name!, icon.svg),
      jsx: icon.jsx ?? getJsxComponentSnippet(icon.name!, icon.svg),
    }));
  } catch (err: any) {
    vscode.window.showErrorMessage(err.message);
    return [...regular, ...solid, ...brands];
  }
};
