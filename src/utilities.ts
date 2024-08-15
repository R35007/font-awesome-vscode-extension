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

const defaultIcons = [...brands, ...light, ...regular, ...solid];

// ALPHANUMERIC CASE --> Keep only alphabets and numbers and remove all special characters
/** @example "Foo--123-Bar-@-Qux-Baz" = "Foo 123 Bar Qux Baz" */
const toAlphaNumericCase = (input: string = "") =>
  input
    .trim()
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// SPACE CASE -> Adds space before uppercase characters
/** @example "fooBarQuxBaz" = "Foo Bar Qux Baz" */
const toSpaceCase = (input: string = "") =>
  toAlphaNumericCase(input)
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim();

/** @example "FooBar-Qux__Baz-fooBar" = "FooBarQuxBazFooBar" */
const toPascalCase = (input: string = "") =>
  toSpaceCase(input)
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (match) => match.toUpperCase())
    .replace(/\s+/g, "") // remove all spaces
    .trim();


function toComponentNameCase(name: string) {
  // Add prefix "Icon" if the string starts with a number
  if (/^\d/.test(name)) {
    name = 'Icon' + name;
  }
  return toPascalCase(name);
}

const distinct = (value: string[] = []) => [...new Set(value)];

const sanitizedKeywords = (keywords: string[] = []) => distinct(keywords.map(kw => kw.toLowerCase()).filter(Boolean));

export const getJsxComponentSnippet = (iconName: string, svg: string) => `export function ${toComponentNameCase(iconName)} (props) {
  return (
    ${svg.replace("<svg", "<svg {...props} ")}
  )
}`;

export const getTsxComponentSnippet = (iconName: string, svg: string) => `import type { SVGProps } from "react";

export function ${toComponentNameCase(iconName)} (props: SVGProps<SVGSVGElement>) {
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
        category: toComponentNameCase(category).toLowerCase(),
        family: toComponentNameCase(family).toLowerCase(),
        iconName: toComponentNameCase(iconName),
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

const getCustomIconSets = async () => {
  try {
    const customIcons = Settings.customIcons;
    const customIconsFromFolder = (await Promise.all(([] as string[]).concat(Settings.customIconsFolderPaths).map(getCustomIconSetsFromFolder))).flat();
    const customIconsArchive = ([] as string[]).concat(Settings.customIconsArchivePaths).map((iconArchiveJsonPath) => JSON.parse(fs.readFileSync(iconArchiveJsonPath, "utf-8"))).flat();

    const customIconsList = [...customIcons, ...customIconsFromFolder, ...customIconsArchive];
    return customIconsList.map(icon => ({
      ...icon,
      categories: icon.categories?.length ? icon.categories : ["others"],
      keywords: icon.keywords?.length ? sanitizedKeywords([...icon.keywords, icon.name, icon.label, ...icon.categories]) : sanitizedKeywords([icon.name, icon.label, ...icon.categories, "others"]),
      react: icon.react ?? `<${toComponentNameCase(icon.name)} />`,
      tsx: icon.tsx ?? getTsxComponentSnippet(icon.name, icon.svg),
      jsx: icon.jsx ?? getJsxComponentSnippet(icon.name, icon.svg),
    }));
  } catch (err: any) {
    vscode.window.showErrorMessage(err.message);
    return [] as IconSnippet[];
  }
}

export const getIcons = async (): Promise<IconSnippet[]> => {
  try {
    const customIcons: IconSnippet[] = await getCustomIconSets();
    const icons: IconSnippet[] = [...defaultIcons, ...customIcons];
    const uniqueIcons = [...new Map(icons.map((icon) => [`${icon.name}-${icon.family}`, icon])).values()];
    return uniqueIcons;
  } catch (err: any) {
    vscode.window.showErrorMessage(err.message);
    return [...regular, ...solid, ...brands];
  }
};
