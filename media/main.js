const vscode = acquireVsCodeApi();


const star = '<svg aria-hidden="true" data-prefix="fal" data-icon="star" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" class="svg-inline--fa fa-star fa-w-18 fa-7x"><path fill="currentColor" d="M528.1 171.5L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6zM405.8 317.9l27.8 162L288 403.5 142.5 480l27.8-162L52.5 203.1l162.7-23.6L288 32l72.8 147.5 162.7 23.6-117.7 114.8z" class=""></path></svg>';
const starFilled = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/></svg>';

const chunkLength = 100; // number of icons to render per page

const debounce = (fn, ms = 200) => {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(fn.bind(this, ...args), ms);
  };
}

const sanitize = (str = '') => `${str}`.replace(/\-/g, "").replace(/\s/g, "").toLowerCase();
const toTrimLoweCase = (str = '') => `${str?.trim()}`.replace(/\s+/g, ' ').trim().toLowerCase();
const isExactlyMatched = (textToMatch = '', icon = {}) => sanitize(textToMatch) === sanitize(icon.name) || sanitize(textToMatch) === sanitize(icon.label);
const isMatched = (textToMatch = '', matchList = []) => matchList.map(sanitize).some(text => text.startsWith(sanitize(textToMatch)) || text.includes(sanitize(textToMatch)));
const isPartiallyMatched = (textToMatch = '', icon = {}) => {

  const matchList = [
    icon.name,
    icon.label,
    icon.objectID,
    icon.unicode,
    icon.ranking,
    icon.family,
    icon.class,
    ...(icon.categories || []),
    ...(icon.keywords || [])
  ].filter(Boolean);

  return matchList.filter(Boolean).map(sanitize).some((item) => item.includes(sanitize(textToMatch)));
}

const getFilteredIcons = (icons, viewState) => icons
  .filter(({ family }) => (viewState.iconFamily === "all" ? true : viewState.iconFamily.toLowerCase() === family.toLowerCase()))
  .filter(({ categories }) => viewState.iconCategory === "all" ? true : categories.map(c => c.toLowerCase()).includes(viewState.iconCategory.toLowerCase()))
  .filter((icon) => viewState.matchWholeWord && viewState.searchText?.trim().length ? isExactlyMatched(viewState.searchText, icon) : isPartiallyMatched(viewState.searchText, icon));

const getSortedIcons = (icons, viewState) => {
  // sort by alphabet
  if (!viewState.sortByFeature) {
    return icons.toSorted((a, b) => {
      if (a.label.toLowerCase() < b.label.toLowerCase()) return -1;
      if (a.label.toLowerCase() > b.label.toLowerCase()) return 1;
      return 0;
    });
  }

  // sort by search Text
  if (viewState.searchText?.trim().length)
    return icons.toSorted((a, b) => {
      const aName = toTrimLoweCase(a.name);
      const bName = toTrimLoweCase(b.name);
      const aLabel = toTrimLoweCase(a.label);
      const bLabel = toTrimLoweCase(b.label);
      const searchText = toTrimLoweCase(viewState.searchText);

      if (aName === searchText || aLabel === searchText) return -1;
      if (bName === searchText || bLabel === searchText) return 1;
      if ((aName.startsWith(searchText) && !bName.startsWith(searchText)) || (aLabel.startsWith(searchText) && !bLabel.startsWith(searchText))) return -1;
      if ((!aName.startsWith(searchText) && bName.startsWith(searchText)) || (!aLabel.startsWith(searchText) && bLabel.startsWith(searchText))) return 1;
      if ((aName.includes(searchText) && !bName.includes(searchText)) || (aLabel.includes(searchText) && !bLabel.includes(searchText))) return -1;
      if ((!aName.includes(searchText) && bName.includes(searchText)) || (!aLabel.includes(searchText) && bLabel.includes(searchText))) return 1;
      return 0;
    });

  // sort by features

  // sort by family if no family is selected
  if (viewState.iconFamily === 'all' && viewState.iconCategory === 'all')
    return icons.toSorted((a, b) => {
      if (a.family.toLowerCase() < b.family.toLowerCase()) return -1;
      if (a.family.toLowerCase() > b.family.toLowerCase()) return 1;
      const aCategory = viewState.allCategories.findIndex(cat => a.categories.includes(cat));
      const bCategory = viewState.allCategories.findIndex(cat => b.categories.includes(cat));
      return aCategory - bCategory;
    });

  // sort by categories if family is selected and no categories is selected
  if (viewState.iconFamily !== 'all' && viewState.iconCategory === 'all') {
    const allCategories = viewState.categoriesByFamily[viewState.iconFamily];
    return icons.toSorted((a, b) => {
      const aCategory = allCategories.findIndex(cat => a.categories.includes(cat));
      const bCategory = allCategories.findIndex(cat => b.categories.includes(cat));
      return aCategory - bCategory;
    });
  }

  return icons;
};

const getIconItemsList = (icons = [], viewState) => {
  return icons.map((icon) => {
    const isSelectedIcon = `${icon.name}-${icon.family}` === `${viewState.selectedIcon.name}-${viewState.selectedIcon.family}`;
    return /* html */`
                <li class="icon-item flex-auto ${isSelectedIcon ? "selected" : ""}" 
                    tabindex="0"
                    ${isSelectedIcon ? "aria-selected" : ""}
                    title="${icon.name} - ${icon.family}"
                    data-icon-name="${icon.name}"
                    data-icon-label="${icon.label}"
                    data-icon-family="${icon.family}"
                    data-icon-categories="${icon.categories.join(', ')}"
                    data-icon-keywords="${icon.keywords.join(', ')}"
                >
                    <div class="icon">${icon.svg}</div>
                    <div class="icon-name">${icon.label}</div>
                </li>
            `;
  });
};

const loadMoreIcons = (iconChunks, viewState, $iconsList) => {
  const lastIconItem = document.querySelector(".icon-item:last-child");

  if (!lastIconItem) return;

  const lastIconObserver = new IntersectionObserver((entries) => {
    const lastIcon = entries[0];
    if (!lastIcon.isIntersecting) return;

    if (!iconChunks.length) return lastIconObserver.unobserve(lastIcon.target);
    const iconItemsList = getIconItemsList(iconChunks.shift(), viewState);
    $iconsList.insertAdjacentHTML("beforeend", iconItemsList.join(""));
    lastIconObserver.unobserve(lastIcon.target);
    lastIconObserver.observe(document.querySelector(".icon-item:last-child"));
  });

  lastIconObserver?.observe(lastIconItem);
};

function init(iconsList, viewState, ViewType, ViewTypeIcon) {

  const setViewState = (key, value) => {
    viewState[key] = value;
    vscode.postMessage({ type: "SET_VIEW_STATE", payload: { key, value } });
  };

  const categoriesByFamily = iconsList.reduce((res, icon) => {
    const categories = [res[icon.family], icon.categories].flat().filter(Boolean).map(c => c.toLowerCase()).sort()
    return { ...res, [icon.family]: [...new Set(categories)] }
  }, {});
  const allCategories = Object.entries(categoriesByFamily).reduce((res, [_key, categories]) => [...new Set(res.concat(categories))].sort(), []);
  viewState.categoriesByFamily = categoriesByFamily;
  viewState.allCategories = allCategories;

  if (viewState.iconFamily !== 'all' && !categoriesByFamily[viewState.iconFamily]?.includes(viewState.iconCategory)) setViewState('iconCategory', 'all');

  const $html = document.getElementsByTagName("html")[0];
  const $iconCategoryDropDownContainer = document.getElementById("icon-category-dropdown-container");
  const $categoryCount = document.getElementById("category-count");
  const $iconsList = document.getElementById("icons-list"); // ul
  const $totalIconsCount = document.getElementById("total-icons");
  const $textAreasList = document.querySelectorAll("vscode-panel-view vscode-text-area");
  const $selectedIconCategoryBadges = document.getElementById("selected-icon-category-badges");
  const $selectedIconLabel = document.getElementById("selected-icon-label");
  const $selectedIconName = document.getElementById("selected-icon-name");
  const $selectedIconImage = document.getElementById("selected-icon-image");
  const $selectedIconFavoriteBtn = document.getElementById("selected-icon-favorite-btn");
  const $toggleViewBtn = document.getElementById("view-toggle-btn");
  const $matchWholeWordBtn = document.getElementById("match-whole-word-btn");
  const $iconInfoContainer = document.getElementById("icon-info-container");
  const $iconSize = document.getElementById("icon-size");
  const $copyBtn = document.getElementById("copy-btn");

  const renderCategoryOptions = () => {
    const categories = categoriesByFamily[viewState.iconFamily] || allCategories;

    const isCategorySelected = categories.includes(viewState.iconCategory);
    if (!isCategorySelected) setViewState("iconCategory", "all");

    const categoriesOptions = ["all", ...categories].map((category) => `
    <vscode-option  ${category === viewState.iconCategory ? "selected" : ""}  value="${category}">
      ${category}
    </vscode-option>`
    )
    $categoryCount.innerText = categoriesOptions.length - 1;
    $iconCategoryDropDownContainer.innerHTML = `<vscode-dropdown class="w-100" style="text-transform: capitalize; margin-top: 5px;">${categoriesOptions.join("")}</vscode-dropdown>`;
  };

  const displaySelectedIconInfo = () => {
    const selectedIconObj = viewState.selectedIcon;

    const isFavoriteIcon = viewState.favoriteIcons.find(icon => `${icon.name}-${icon.family}` === `${viewState.selectedIcon.name}-${viewState.selectedIcon.family}`);

    if (isFavoriteIcon) {
      $selectedIconFavoriteBtn?.classList.add("selected-icon-favorite-btn--checked");
      viewState.selectedIcon.favorite = true;
      setViewState("selectedIcon", viewState.selectedIcon);
    } else {
      $selectedIconFavoriteBtn?.classList.remove("selected-icon-favorite-btn--checked");
      viewState.selectedIcon.favorite = false;
      setViewState("selectedIcon", viewState.selectedIcon);
    }
    $selectedIconFavoriteBtn.innerHTML = viewState.selectedIcon.favorite ? starFilled : star;

    const $snippetTabsList = document.querySelectorAll("vscode-panel-tab");
    $snippetTabsList.forEach((tab) => {
      const type = tab.dataset.type;
      tab.style.display = !selectedIconObj[type] ? "none" : "block";
    });

    $textAreasList.forEach((textarea) => {
      const type = textarea.dataset.type;
      textarea.value = selectedIconObj[type] || "";
    });

    $selectedIconLabel.innerText = selectedIconObj.label;
    $selectedIconLabel.title = selectedIconObj.label;
    $selectedIconName.innerText = selectedIconObj.family;
    $selectedIconImage.innerHTML = selectedIconObj.svg;
    $selectedIconFavoriteBtn.innerHTML = selectedIconObj.favorite ? starFilled : star;

    const badges = selectedIconObj.categories?.sort().map((category) => `<vscode-badge tabindex="0">${category}</vscode-badge>`).join("") || "";

    $selectedIconCategoryBadges.innerHTML = `<span>Categories : ${selectedIconObj.categories.length} </span>${badges}`;
  };

  const renderIconItems = (isFiltered) => {
    const filteredAndSortedIcons = getSortedIcons(getFilteredIcons(iconsList, viewState), viewState);

    // Select first item in list if no icon is selected;
    if (isFiltered && filteredAndSortedIcons[0]) {
      $html.scrollTop = 0;
      setViewState("selectedIcon", filteredAndSortedIcons[0]);
      displaySelectedIconInfo();
    };
    $totalIconsCount.innerText = filteredAndSortedIcons.length;

    const iconChunks = [];
    while (filteredAndSortedIcons.length) {
      iconChunks.push(filteredAndSortedIcons.splice(0, chunkLength));
    }

    const iconItemsList = getIconItemsList(iconChunks.shift(), viewState);
    $iconsList.innerHTML = iconItemsList.join("") || "";
    loadMoreIcons(iconChunks, viewState, $iconsList);
  };

  renderCategoryOptions(); // render categories options on page load
  renderIconItems(true); // render icon items on page load
  displaySelectedIconInfo(); // render selected icon on page load

  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const data = event.data; // The json data that the extension sent
    switch (data.type) {
      case "ToggleIconName":
        viewState.showIconName = data.value;
        viewState.showIconName ? $iconsList?.classList.remove("icons-list--icon-only") : $iconsList?.classList.add("icons-list--icon-only");
        $toggleViewBtn.style.display = viewState.showIconName ? 'block' : 'none';
        break;
      case "ToggleIconInfo":
        viewState.showIconInfo = data.value;
        $iconInfoContainer.style.display = viewState.showIconInfo ? "flex" : "none";
        break;
      case "ToggleCategoryBadge":
        viewState.showCategoryBadge = data.value;
        $selectedIconCategoryBadges.style.display = data.value ? "flex" : "none";
        break;
      case "ToggleSortByFeature":
        viewState.sortByFeature = data.value;
        renderIconItems();
        break;
    }
  });

  const copySnippet = (selectedIcon = viewState.selectedIcon) => {
    vscode.postMessage({ type: "COPY", payload: { selectedIcon, copyType: viewState.copySnippetAs } });
  };

  // On Icon Family dropdown change
  document.getElementById("icon-family")?.addEventListener("change", function (event) {
    setViewState("iconFamily", event.target?.value);
    renderCategoryOptions();
    renderIconItems(true);
  });

  // On icon Category change
  $iconCategoryDropDownContainer?.addEventListener("change", function (event) {
    if (!event.target?.matches("vscode-dropdown")) return;
    setViewState("iconCategory", event?.target.value);
    renderIconItems(true);
  });

  // On Tab switch
  document.querySelector("#icon-info-container vscode-panels")?.addEventListener('click', function (event) {
    if (!event.target?.matches("vscode-panel-tab")) return;
    $copyBtn.dataset.copyType = event.target.dataset.copyType;
    setViewState("copySnippetAs", event.target.dataset.copyType);
  })

  // On search or filter icons
  document.getElementById("search-icon-textbox")?.addEventListener(
    "keyup",
    debounce(function () {
      setViewState("searchText", this.value.toLowerCase().trim());
      renderIconItems(true);
    })
  );

  // On Slider change
  document.getElementById("icon-size-slider")?.addEventListener("input", function (event) {
    const value = parseFloat(event.target?.value, 10);
    $iconSize.innerText = `${value}px`;

    $iconsList?.style.setProperty('--icon-size', `${value}px`);
    setViewState("iconSize", value);

  });

  // On clicking copy button
  $copyBtn?.addEventListener("click", () => copySnippet());

  // On clicking copy button
  $matchWholeWordBtn?.addEventListener("click", (event) => {
    event.target?.classList.toggle("match-whole-word-btn--checked");
    setViewState("matchWholeWord", !viewState.matchWholeWord);
    renderIconItems();
  });

  // On Selected Image click
  $selectedIconImage?.addEventListener("click", function () {
    vscode.postMessage({ type: "SAVE", payload: { selectedIcon: viewState.selectedIcon } });
  });

  // Toggle Icon Item view
  $toggleViewBtn?.addEventListener("click", function (event) {
    const currentView = event.target?.dataset.currentView;

    const viewSwitch = {
      [ViewType.Staggered]: ViewType.List,
      [ViewType.List]: ViewType.Grid,
      [ViewType.Grid]: ViewType.Staggered,
    }

    const viewType = viewSwitch[currentView] || ViewType.Staggered

    setViewState("viewType", viewType); setViewState("viewType", viewType);
    event.target.dataset.currentView = viewType;
    event.target.innerHTML = ViewTypeIcon[viewType];
    Object.values(ViewType).forEach(view => $iconsList?.classList.remove(`icons-list--${view}`))
    $iconsList?.classList.add(`icons-list--${viewType}`);
  });

  // Toggle Favorites
  $selectedIconFavoriteBtn?.addEventListener("click", function (event) {
    event.target?.classList.toggle("selected-icon-favorite-btn--checked");
    viewState.selectedIcon.favorite = !viewState.selectedIcon.favorite;
    setViewState("selectedIcon", viewState.selectedIcon);
    event.target.innerHTML = viewState.selectedIcon.favorite ? starFilled : star;

    const favoriteIndex = viewState.favoriteIcons.findIndex(icon => `${icon.name}-${icon.family}` === `${viewState.selectedIcon.name}-${viewState.selectedIcon.family}`);
    const isAlreadyAdded = favoriteIndex !== -1;

    viewState.selectedIcon.favorite && !isAlreadyAdded && viewState.favoriteIcons?.push(viewState.selectedIcon);
    !viewState.selectedIcon.favorite && isAlreadyAdded && viewState.favoriteIcons?.splice(favoriteIndex, 1);

    setViewState('favoriteIcons', viewState.favoriteIcons)
  })

  // Invert Background
  document.getElementById("invert-bg-btn")?.addEventListener("click", function (event) {
    setViewState("isInverted", !viewState.isInverted);
    if (viewState.isInverted) {
      event.target?.classList.add("invert-bg-btn--inverted");
      $iconsList?.classList.add("icons-list--inverted");
      $selectedIconImage?.classList.add("selected-icon-image--inverted");
    } else {
      event.target?.classList.remove("invert-bg-btn--inverted");
      $iconsList?.classList.remove("icons-list--inverted");
      $selectedIconImage?.classList.remove("selected-icon-image--inverted");
    }
  });

  const selectIcon = (event) => {
    const iconName = event.target?.dataset.iconName;
    const iconFamily = event.target?.dataset.iconFamily;
    const selectedIcon = iconsList.find((icon) => icon.name === iconName && icon.family === iconFamily);

    setViewState("selectedIcon", selectedIcon);
    $iconsList?.querySelectorAll('.icon-item')?.forEach((li) => li.classList.remove("selected"));
    event.target?.classList.add("selected");

    displaySelectedIconInfo(); // display selected icon info
  }

  // On Icon item click
  $iconsList?.addEventListener('click', function (event) {
    if (!event.target?.matches(".icon-item")) return;
    selectIcon(event);
  })
  // On Icon item enter
  $iconsList?.addEventListener('keydown', function (event) {
    if (!event.target?.matches(".icon-item")) return;
    if (event.code === "Enter")
      copySnippet(viewState.selectedIcon); // copy snippet
  })
  // On Icon item left and right arrow press
  $iconsList?.addEventListener('keydown', function (event) {
    if (!event.target?.matches(".icon-item")) return;
    if (event.code === "ArrowRight")
      event.target?.nextElementSibling?.focus();
    if (event.code === "ArrowLeft")
      event.target?.previousElementSibling?.focus();
  })
  // On Icon item up and down arrow press
  $iconsList?.addEventListener('keydown', function (event) {
    if (!event.target?.matches(".icon-item")) return;

    let currentElement = event.target;

    const containerComputerStyle = window.getComputedStyle($iconsList);
    const col = containerComputerStyle.getPropertyValue('grid-template-columns').replace(' 0px', '').split(' ').length;

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      for (let i = 0; i < col; i++) {
        if (currentElement.previousElementSibling) {
          currentElement = currentElement.previousElementSibling;
        } else {
          break;
        }
      }
      currentElement.focus();

    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      for (let i = 0; i < col; i++) {
        if (currentElement.nextElementSibling) {
          currentElement = currentElement.nextElementSibling;
        } else {
          break;
        }
      }
      currentElement.focus();

    }
  })
  // On Icon item focus
  $iconsList?.addEventListener('focusin', function (event) {
    if (!event.target?.matches(".icon-item")) return;
    selectIcon(event);
  })
  // Copy Icon on double click
  $iconsList?.addEventListener('dblclick', function (event) {
    if (!event.target?.matches(".icon-item")) return;
    copySnippet(viewState.selectedIcon); // copy snippet
  })

  // On selected Icon badges click
  $selectedIconCategoryBadges?.addEventListener('click', function (event) {
    if (!event.target?.matches("vscode-badge")) return;
    setViewState("iconCategory", event.target.innerHTML);
    renderCategoryOptions();
    renderIconItems();
  })
  // On selected Icon badges entered
  $selectedIconCategoryBadges?.addEventListener('keydown', function (event) {
    if (!event.target?.matches("vscode-badge")) return;
    if (event.code === "Enter") {
      setViewState("iconCategory", event.target.innerHTML);
      renderCategoryOptions();
      renderIconItems();
    };
    if (event.code === "ArrowRight")
      event.target?.nextElementSibling?.focus();
    if (event.code === "ArrowLeft")
      event.target?.previousElementSibling?.focus();
  })
}
