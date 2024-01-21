/* eslint-disable @typescript-eslint/naming-convention */
const cheatSheetIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--! Font Awesome Free 6.2.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2022 Fonticons, Inc. --><path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg>';
const compactIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--! Font Awesome Free 6.2.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2022 Fonticons, Inc. --><path d="M384 96V224H256V96H384zm0 192V416H256V288H384zM192 224H64V96H192V224zM64 288H192V416H64V288zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64z"/></svg>';
const cheatSheetStaggeredIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--! Font Awesome Free 6.2.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2022 Fonticons, Inc. --><path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM64 256c0-17.7 14.3-32 32-32H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H96c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg>';

const View = {
  CheatSheetStaggered: "CheatSheetStaggered",
  CheatSheet: "CheatSheet",
  Compact: "Compact",
};

const viewTypeIconMapping = {
  [View.CheatSheetStaggered]: cheatSheetStaggeredIcon,
  [View.CheatSheet]: cheatSheetIcon,
  [View.Compact]: compactIcon,
};

const vscode = acquireVsCodeApi();

function init(iconsList, viewState) {
  const $selectedIconLabel = document.getElementById("selected-icon-label");
  const $selectedIconName = document.getElementById("selected-icon-name");
  const $iconFamilyDropDown = document.getElementById("icon-family");
  const $iconCategoryDropDown = document.getElementById("icon-category");
  const $categoryCount = document.getElementById("category-count");

  const $iconInfoContainer = document.getElementById("icon-info-container");
  const $selectedIconImage = document.getElementById("selected-icon-image");
  const $selectedIconCategories = document.getElementById("selected-icon-categories");
  const $copyBtn = document.getElementById("copy-btn");
  const $snippetTabsList = document.querySelectorAll("vscode-panel-tab");

  const $zoomPercent = document.getElementById("zoom-percent");
  const $iconSizeSlider = document.getElementById("icon-size-slider");

  const $searchTextBox = document.getElementById("search-icon-textbox");
  const $totalIconsCount = document.getElementById("total-icons");
  const $viewToggleBtn = document.getElementById("view-toggle-btn");
  const $invertBtn = document.getElementById("invert-bg");

  const $iconsList = document.getElementById("icons-list"); // ul
  let $iconsItem = $iconsList.querySelectorAll(".icon-item"); // li

  let searchText = viewState.searchText;
  let iconSize = viewState.iconSize + "px";
  let isInverted = viewState.isInverted;

  let iconFamily = viewState.iconFamily;
  let iconCategory = viewState.iconCategory;

  let shouldCopyOnClick = viewState.copyOnClick;
  let showIconInfo = viewState.showIconInfo;
  let copySnippetAs = viewState.copySnippetAs;
  let sortType = viewState.sortType;
  let viewType = viewState.viewType;

  let selectedIcon = viewState.selectedIcon;
  let showIconName = viewState.showIconName;

  let icons = iconsList;
  let iconChunks = [];
  const chunkLength = 100;

  function delay(fn, ms = 500) {
    let timer = 0;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(fn.bind(this, ...args), ms);
    };
  }

  const setViewState = (key, value) => {
    vscode.postMessage({ type: "SET_VIEW_STATE", payload: { key, value } });
  };

  const copySnippet = (copyType = copySnippetAs) => {
    vscode.postMessage({ type: "COPY", payload: { selectedIcon, copyType } });
  };

  const getIconListStyle = () => {
    let style = {};

    if (viewType === View.CheatSheet) {
      style = {
        display: "grid",
        "grid-template-columns": "repeat(auto-fit, minmax(200px, 1fr))",
      };
    }

    if (viewType === View.CheatSheetStaggered) {
      style = {
        display: "flex",
        "grid-template-columns": "none",
      };
    }

    if (viewType === View.Compact) {
      style = {
        display: "grid",
        "grid-template-columns": "repeat(auto-fit, minmax(90px, 1fr))",
      };
    }

    if (!showIconName) {
      style.display = "flex";
      style["grid-template-columns"] = "none";
    }

    return Object.entries(style)
      .map(([key, val]) => `${key}: ${val}`)
      .join(";");
  };

  const getIconItemStyle = () => {
    let style = {
      padding: "2px",
      "max-width": "none",
      background: isInverted ? "var(--vscode-menu-foreground)" : "var(--vscode-menu-background)",
      color: isInverted ? "var(--vscode-menu-background)" : "var(--vscode-menu-foreground)",
    };

    if (viewType === View.CheatSheet || viewType === View.CheatSheetStaggered) {
      style = {
        ...style,
        "justify-content": "flex-start",
        "flex-direction": "row",
        "text-align": "left",
      };
    }

    if (viewType === View.Compact) {
      style = {
        ...style,
        "justify-content": "space-evenly",
        "flex-direction": "column",
        "text-align": "center",
      };
    }

    if (!showIconName) {
      style = {
        ...style,
        padding: "0.5rem",
        "max-width": "fit-content",
      };
    }

    return Object.entries(style)
      .map(([key, val]) => `${key}: ${val}`)
      .join(";");
  };

  const getIconStyle = () => {
    const style = {
      width: iconSize,
      height: iconSize,
      "min-width": iconSize,
      "min-height": iconSize,
      fill: isInverted ? "var(--vscode-menu-background)" : "var(--vscode-menu-foreground)",
      color: isInverted ? "var(--vscode-menu-background)" : "var(--vscode-menu-foreground)",
    };

    return Object.entries(style)
      .map(([key, val]) => `${key}: ${val}`)
      .join(";");
  };

  const getIconNameStyle = () => {
    const style = {
      display: showIconName ? "block" : "none",
      "text-align": viewType === View.Compact ? "center" : "left",
      color: isInverted ? "var(--vscode-menu-background)" : "var(--vscode-menu-foreground)",
    };

    return Object.entries(style)
      .map(([key, val]) => `${key}: ${val}`)
      .join(";");
  };

  const refreshListStyle = () => {
    $iconsList.style = getIconListStyle();
    $iconsItem.forEach((li) => {
      li.style = getIconItemStyle();
      li.children[0].style = getIconStyle();
      li.children[1].style = getIconNameStyle();
    });
  };

  const toggleCategoryBadgeContainer = (value) => {
    showCategoryBadge = value;
    $selectedIconCategories.style.display = value ? "flex" : "none";
  };

  const toggleIconInfoContainer = (value) => {
    showIconInfo = value;
    $iconInfoContainer.style.display = value ? "flex" : "none";
  };

  const toggleIconName = (value) => {
    showIconName = value;
    if (!showIconName) {
      $iconsList.style = getIconListStyle();
      $iconsItem.forEach((li) => {
        li.style = getIconItemStyle();
        li.children[1].style.display = "none";
      });
      $viewToggleBtn.style.display = "none";
    } else {
      $iconsList.style = getIconListStyle();
      $iconsItem.forEach((li) => {
        li.style = getIconItemStyle();
        li.children[1].style.display = "block"; // show Icon Name
        li.children[1].style.textAlign = View.Compact ? "center" : "left";
      });
      $viewToggleBtn.style.display = "block";
    }
  };

  const toggleSortByFeature = (value) => {
    sortType = value ? "feature" : "alphabet";
    generateIconItems();
  };

  const getSortedIcons = (icons) => {
    let sortedList;

    // sort by feature
    if (sortType === "feature") {
      sortedList = [...icons].sort((a, b) => a.name - b.name);
    }

    // sort by alphabet
    if (sortType === "alphabet") {
      sortedList = [...icons].sort((a, b) => {
        if (a.label < b.label) {
          return -1;
        }
        if (a.label > b.label) {
          return 1;
        }
        return 0;
      });
    }

    // Select first item in list if ot icon is selected;
    if (!selectedIcon || !Object.keys(selectedIcon).length) selectedIcon = sortedList[0];

    return sortedList;
  };

  const getFilteredIcons = (icons) => {
    const word = (str) => str.replace(/\-/g, "").replace(/\s/g, "").toLowerCase();

    const isTextMatched = (textToMatch, textToMatchList) =>
      textToMatch && Array.isArray(textToMatchList) ? textToMatchList.map(word).some((c) => c.includes(word(textToMatch))) : true;

    return getSortedIcons(icons)
      .filter(({ family }) => (iconFamily === "all" ? true : iconFamily.toLowerCase() === family.toLowerCase()))
      .filter(({ categories }) => isTextMatched(iconCategory === "all" ? "" : iconCategory, categories))
      .filter(({ keywords }) => isTextMatched(searchText, keywords));
  };

  const addOnBadgeClickListener = () => {
    const $badges = document.querySelectorAll("#selected-icon-categories vscode-badge");
    $badges.forEach((badge) =>
      badge.addEventListener("click", function (event) {
        event.preventDefault();
        iconCategory = this.innerHTML;
        $iconCategoryDropDown.value = this.innerText;
        setViewState("iconCategory", iconCategory);
        generateIconItems();
      })
    );
  };

  const displaySelectedIconInfo = () => {
    const selectedIconObj = selectedIcon;

    $snippetTabsList.forEach((tab) => {
      const type = tab.dataset.type;
      tab.style.display = !selectedIconObj[type] ? "none" : "block";
    });

    const $textAreasList = document.querySelectorAll("vscode-panel-view vscode-text-area");

    $textAreasList.forEach((textarea) => {
      const type = textarea.dataset.type;
      textarea.value = selectedIconObj[type] || "";
    });

    $selectedIconLabel.innerText = selectedIconObj.label;
    $selectedIconLabel.title = `${selectedIconObj.label} - ${selectedIconObj.family}`;
    $selectedIconName.innerText = selectedIconObj.name;

    $selectedIconImage.style.fill = isInverted ? "var(--vscode-menu-background)" : "var(--vscode-menu-foreground)";
    $selectedIconImage.style.color = isInverted ? "var(--vscode-menu-background)" : "var(--vscode-menu-foreground)";
    $selectedIconImage.style.background = isInverted ? "var(--vscode-menu-foreground)" : "var(--vscode-menu-background)";

    $selectedIconImage.innerHTML = selectedIconObj.svg;

    $selectedIconCategories.innerHTML = selectedIconObj.categories?.length
      ? selectedIconObj.categories.map((category) => `<vscode-badge>${category}</vscode-badge>`).join("")
      : "";

    addOnBadgeClickListener();
  };

  const addOnIconClickListener = () => {
    $iconsItem = document.querySelectorAll(".icon-item");

    function onClick(event) {
      event.preventDefault();

      const iconName = this.dataset.iconName;
      const iconFamily = this.dataset.iconFamily;

      selectedIcon = icons.find((icon) => icon.name === iconName && icon.family === iconFamily);
      $iconsItem.forEach((li) => li.classList.remove("selected"));
      this.classList.add("selected");
      displaySelectedIconInfo(); // display selected icon info

      setViewState("selectedIcon", selectedIcon);
      (shouldCopyOnClick || !showIconInfo) && copySnippet(); // Immediately copy snippet on click of the icon
    }

    $iconsItem.forEach((li) => {
      if (!li.getAttribute("listener")) {
        li.setAttribute("listener", "click");
        li.addEventListener("click", onClick);
      }
    });
  };

  const getIconItemsList = (icons = []) => {
    return icons.map((icon) => {
      const className = `icon-item flex-auto ${JSON.stringify(icon) === JSON.stringify(selectedIcon) ? "selected" : ""}`;
      return `
                <li class="${className}" 
                    title="${icon.name}"
                    data-icon-name="${icon.name}"
                    data-icon-family="${icon.family}"
                    style="${getIconItemStyle()}"
                >
                    <div class="icon" style="${getIconStyle()}">${icon.svg}</div>
                    <div class="icon-name" style="${getIconNameStyle()}">
                        ${icon.label}
                    </div>
                </li>
            `;
    });
  };

  const loadMoreIcons = () => {
    const lastIconObserver = new IntersectionObserver((entries) => {
      const lastIcon = entries[0];
      if (!lastIcon.isIntersecting) return;

      if (!iconChunks.length) return lastIconObserver.unobserve(lastIcon.target);
      const iconItemsList = getIconItemsList(iconChunks.shift());
      $iconsList.insertAdjacentHTML("beforeend", iconItemsList.join(""));

      addOnIconClickListener();
      lastIconObserver.unobserve(lastIcon.target);
      lastIconObserver.observe(document.querySelector(".icon-item:last-child"));
    });

    lastIconObserver.observe(document.querySelector(".icon-item:last-child"));
  };

  const generateIconItems = () => {
    const filteredIcons = getFilteredIcons(icons);

    iconChunks = [];
    $totalIconsCount.innerText = filteredIcons.length;
    while (filteredIcons.length) {
      iconChunks.push(filteredIcons.splice(0, chunkLength));
    }

    const iconItemsList = getIconItemsList(iconChunks.shift());

    $iconsList.style = getIconListStyle();
    $iconsList.innerHTML = iconItemsList.join("") || "";
    addOnIconClickListener();
    loadMoreIcons();
  };

  function setCategoryOptions() {
    const categories = [
      ...new Set(
        iconsList
          .filter((icon) => (iconFamily === "all" ? true : icon.family === iconFamily))
          .map((icon) => icon.categories)
          .flat()
          .map((category) => category.toLowerCase())
          .filter(Boolean)
      ),
    ];
    const categoriesOptions = ["all", ...categories.sort()]
      .map(
        (category) =>
          `<vscode-option ${
            iconCategory === category ? "selected" : ""
          } style="text-transform: capitalize;" value="${category}">${category}</vscode-option>`
      )
      .join("");
    if (!categories.includes(iconCategory)) {
      iconCategory = "all";
      setViewState("iconCategory", iconCategory);
    }
    $categoryCount.innerText = categories.length;
    $iconCategoryDropDown.innerHTML = categoriesOptions;
  }

  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const data = event.data; // The json data that the extension sent
    switch (data.type) {
      case "ToggleIconName":
        toggleIconName(data.value);
        break;
      case "ToggleIconInfo":
        toggleIconInfoContainer(data.value);
        break;
      case "ToggleCategoryBadge":
        toggleCategoryBadgeContainer(data.value);
        break;
      case "ToggleSortByFeature":
        toggleSortByFeature(data.value);
        break;
      case "setCopyType":
        copySnippetAs = data.value;
        break;
    }
  });

  // On Icon Style / Family dropdown change
  $iconFamilyDropDown.addEventListener("change", function (event) {
    iconFamily = event.target.value;
    setCategoryOptions();
    generateIconItems();
    setViewState("iconFamily", iconFamily);
  });

  // On icon Category change
  $iconCategoryDropDown.addEventListener("change", function (event) {
    event.preventDefault();
    iconCategory = this.value;
    generateIconItems();
    setViewState("iconCategory", iconCategory);
  });

  // On Tab switch
  $snippetTabsList.forEach((tab) =>
    tab.addEventListener("click", function () {
      $copyBtn.dataset.copyType = this.dataset.copyType;
    })
  );

  // On search input change
  $searchTextBox.addEventListener(
    "keyup",
    delay(function (event) {
      value = event.target.value.toLowerCase().trim();
      searchText = value;
      generateIconItems();
      setViewState("searchText", searchText);
    })
  );

  // On Slider change
  $iconSizeSlider.addEventListener("input", function (event) {
    event.preventDefault();
    const value = parseFloat(this.value, 10);
    iconSize = value + "px";

    const minimum = parseInt(this.min);
    const maximum = parseInt(this.max);
    const range = maximum - minimum;
    const zoom = Math.round(((value - minimum) * 100) / range);
    $zoomPercent.innerText = zoom + "%";

    setViewState("zoom", zoom);
    setViewState("iconSize", value);

    // set icon dimensions
    $iconsItem.forEach((li) => {
      li.children[0].style.width = iconSize;
      li.children[0].style.height = iconSize;
      li.children[0].style.minWidth = iconSize;
      li.children[0].style.minHeight = iconSize;
    });
  });

  // On clicking copy button
  $copyBtn.addEventListener("click", function () {
    copySnippet(this.dataset.copyType);
  });

  // On Selected Image click
  $selectedIconImage.addEventListener("click", function (event) {
    event.preventDefault();
    vscode.postMessage({ type: "SAVE", payload: { selectedIcon } });
  });

  // Copy Name
  $selectedIconName.addEventListener("click", function () {
    copySnippet("name");
  });

  // Toggle Icon Item view
  $viewToggleBtn.addEventListener("click", function () {
    const currentView = this.dataset.currentView;

    viewType =
      currentView === View.CheatSheetStaggered
        ? View.CheatSheet
        : currentView === View.CheatSheet
        ? View.Compact
        : View.CheatSheetStaggered;

    setViewState("viewType", viewType);
    $viewToggleBtn.dataset.currentView = viewType;
    $viewToggleBtn.innerHTML = viewTypeIconMapping[viewType];
    refreshListStyle();
  });

  // Invert Background
  $invertBtn.addEventListener("click", function (event) {
    isInverted = !isInverted;
    $selectedIconImage.style.fill = isInverted ? "var(--vscode-menu-background)" : "var(--vscode-menu-foreground)";
    $selectedIconImage.style.color = isInverted ? "var(--vscode-menu-background)" : "var(--vscode-menu-foreground)";
    $selectedIconImage.style.background = isInverted ? "var(--vscode-menu-foreground)" : "var(--vscode-menu-background)";
    refreshListStyle();
  });

  setCategoryOptions();
  generateIconItems();
  displaySelectedIconInfo();
}
