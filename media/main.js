let icons = [];
let searchText = "";
let iconSize = "32px";
let iconStyle = "all";
let totalIcons = 0;
let selectedIcon = {};
let category = '';

const vscode = acquireVsCodeApi();

const $searchTextBox = document.getElementById("search-icon-textbox");
const $iconsList = document.getElementById("icons-list");
let $icons = $iconsList.querySelectorAll(".icon-item");
const $noIconsFound = document.getElementById("no-icons-found");
const $totalIcons = document.getElementById("total-icons");

const $htmlTabLink = document.getElementById("html-snippet");
const $reactTabLink = document.getElementById("react-snippet");
const $vueTabLink = document.getElementById("vue-snippet");
const $svgTabLink = document.getElementById("svg-snippet");
const $base64TabLink = document.getElementById("base64-snippet");
const $unicodeTabLink = document.getElementById("unicode-snippet");
const $iconSize = document.getElementById("icon-size-indicator");

const $selectedIconLabel = document.getElementById("selected-icon-label");
const $selectedIconName = document.getElementById("selected-icon-name");
const $selectedIconImage = document.getElementById("selected-icon-image");
const $htmlSnippet = document.getElementById("html-snippet-textarea");
const $reactSnippet = document.getElementById("react-snippet-textarea");
const $vueSnippet = document.getElementById("vue-snippet-textarea");
const $svgSnippet = document.getElementById("svg-snippet-textarea");
const $base64Snippet = document.getElementById("base64-snippet-textarea");
const $unicodeSnippet = document.getElementById("unicode-snippet-textarea");
const $selectedIconCategories = document.getElementById("selected-icon-categories");

function delay(fn, ms = 500) {
    let timer = 0;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(fn.bind(this, ...args), ms);
    };
}

const getIconsByStyle = () => {
    return iconStyle === 'all' ? Object.entries(icons).map(([key, val]) => val).flat(Infinity) : icons[iconStyle];
};

const addOnBadgeClickListener = () => {
    const $badges = document.querySelectorAll("#selected-icon-categories vscode-badge");
    $badges.forEach(badge => badge.addEventListener("click", function (event) {
        event.preventDefault();
        $searchTextBox.value = `@category:${this.innerText} ${searchText}`;
        $searchTextBox.dispatchEvent(new Event("keyup"));
    }));
};

const displaySelectedIconInfo = () => {
    const selectedIconObj = selectedIcon;

    $htmlTabLink.style.display = !selectedIconObj.html ? "none" : "block";
    $reactTabLink.style.display = !selectedIconObj.react ? "none" : "block";
    $vueTabLink.style.display = !selectedIconObj.vue ? "none" : "block";
    $svgTabLink.style.display = !selectedIconObj.svg ? "none" : "block";
    $base64TabLink.style.display = !selectedIconObj.base64 ? "none" : "block";
    $unicodeTabLink.style.display = !selectedIconObj.unicode ? "none" : "block";

    $selectedIconLabel.innerText = selectedIconObj.label;
    $selectedIconName.innerText = `(${selectedIconObj.name})`;
    $selectedIconImage.innerHTML = selectedIconObj.svg;

    $htmlSnippet.value = selectedIconObj.html || "";
    $reactSnippet.value = selectedIconObj.react || "";
    $vueSnippet.value = selectedIconObj.vue || "";
    $svgSnippet.value = selectedIconObj.svg || "";
    $base64Snippet.value = selectedIconObj.base64 || "";
    $unicodeSnippet.value = selectedIconObj.unicode || "";
    $selectedIconCategories.innerHTML = selectedIconObj.categories?.length
        ? selectedIconObj.categories.map(category => `<vscode-badge>${category}</vscode-badge>`).join("") : "";

    addOnBadgeClickListener();
};

const addEventListeners = () => {
    // On Icon Style drop dowm change
    document.getElementById("icon-style")
        .addEventListener("change", function (event) {
            iconStyle = event.target.value;
            refresh();
        });

    // On search input change
    $searchTextBox.addEventListener("keyup", delay(function (event) {
        value = event.target.value.toLowerCase();
        category = value.match(/@category:([^\s]+)/gi)?.[0]?.replace("@category:", "").trim() || "";
        searchText = value.replace(`@category:${category}`, "").trim();
        refresh();
    }));

    // On Slider change
    document.getElementById("icon-size-slider")
        .addEventListener("input", function (event) {
            event.preventDefault();
            const value = parseFloat(this.value, 10);
            iconSize = value + "px";

            const minimum = parseInt(this.min);
            const maximum = parseInt(this.max);
            const range = maximum - minimum;
            const percent = Math.round(((value - minimum) * 100) / range);
            $iconSize.innerText = percent + "%";

            $icons.forEach(li => {
                li.children[0].style.width = iconSize;
                li.children[0].style.height = iconSize;
                li.style.flexDirection = percent > 60 ? "column" : "row";
            }); // set icon width
        });

    // On clicking copy button
    document.querySelectorAll("vscode-panel-view  .copy-btn").forEach(copyBtn =>
        copyBtn.addEventListener("click", function (event) {
            event.preventDefault();
            const copyType = this.dataset.copytype || "svg";
            vscode.postMessage({ type: "COPY", payload: { selectedIcon, copyType } });
        }));

    // On Selected Image click
    $selectedIconImage.addEventListener("click", function (event) {
        event.preventDefault();
        vscode.postMessage({ type: "SAVE", payload: { selectedIcon } });
    });
};

const addOnIconClickListener = () => {
    $icons = document.querySelectorAll(".icon-item");
    $icons.forEach(li => li.addEventListener("click", function (event) {
        event.preventDefault();
        const iconName = this.dataset.iconName;
        const iconStyle = this.dataset.iconStyle;

        selectedIcon = icons[iconStyle].find(icon => icon.name === iconName);
        $icons.forEach(li => li.classList.remove("selected"));
        this.classList.add("selected");
        displaySelectedIconInfo(); // display selected icon info
    }));
};

const generateIcons = (icons) => {
    totalIcons = 0;

    const isTextMatched = (searchText, textToMatchList) =>
        searchText && Array.isArray(textToMatchList)
            ? textToMatchList.map(c => c.replace(/\-/g, "").replace(/\s/g, "").toLowerCase()).some(c => c.includes(searchText.replace(/\-/g, "").replace(/\s/g, "").toLowerCase()))
            : true;

    const iconsList = icons
        .filter(({ categories }) => isTextMatched(category, categories))
        .filter(({ keywords }) => isTextMatched(searchText, keywords))
        .map((icon) => {
            const className = `icon-item flex-auto ${JSON.stringify(icon) === JSON.stringify(selectedIcon) ? "selected" : ""}`;
            return `
                <li class="${className}" 
                    title="${icon.name}"
                    data-icon-name="${icon.name}"
                    data-icon-style="${icon.family}"
                >
                    <div class="icon" style="width: ${iconSize};">${icon.svg}</div>
                    <div class="icon-name">${icon.label}</div>
                </li>
            `;
        });

    totalIcons = iconsList.length;
    $iconsList.innerHTML = iconsList.join('');
};

const refresh = () => {
    totalIcons = 0;
    generateIcons(getIconsByStyle());
    $totalIcons.innerText = totalIcons;
    addOnIconClickListener();
};

function init(_icons = icons) {
    icons = _icons;
    selectedIcon = icons[Object.keys(icons)[0]][0];
    refresh();
    addEventListeners();
    displaySelectedIconInfo();
}