const editorWindow = window.parent;
const editorDocument = editorWindow.document;

let hadExtendedColours = false;

// marks the css onlyoffice injects from the cache, so it can be removed once the plugin takes over
const cachedCssMarker = "/* themes-extended */";

const editorTypeNames = {
  documenteditor: "document",
  spreadsheeteditor: "spreadsheet",
  presentationeditor: "presentation",
  pdfeditor: "pdf",
};

// custom themes only, built in ones arent in themes.json
async function getCustomTheme(themeId) {
  const versionPath = location.pathname.split("/").filter(Boolean)[0];
  const themesResponse = await fetch(`${location.origin}/${versionPath}/themes.json`);
  const { themes } = await themesResponse.json();

  return themes?.find(theme => theme.id === themeId);
}

function getEditorType() {
  const editorFolder = Object.keys(editorTypeNames).find(editorName => editorDocument.location.pathname.includes(editorName));
  return editorTypeNames[editorFolder];
}

// the class onlyoffice only gives its own modern themes, switches to the modern icons
function setModernIcons(isModern) {
  editorDocument.documentElement.classList.toggle("theme-icons-cls-mod2", isModern);
  editorDocument.body.classList.toggle("theme-icons-cls-mod2", isModern);
}

function writeExtendedColours(extendedColours) {
  let extendedStyle = editorDocument.getElementById("themes-extended");
  if (!Object.keys(extendedColours).length) {
    extendedStyle?.remove();
    return;
  }

  if (!extendedStyle) {
    extendedStyle = editorDocument.createElement("style");
    extendedStyle.id = "themes-extended";
    editorDocument.head.appendChild(extendedStyle);
  }

  const colourRules = Object.entries(extendedColours).map(([colourName, colourValue]) => `--${colourName}:${colourValue} !important`);
  extendedStyle.textContent = `:root,body{${colourRules.join(";")}}`;
}

// onlyoffice only picks the light or dark logo when the theme loads, so redo it with the extended header colour
function updateLogo() {
  const { RGBColor } = editorWindow.Common?.Utils ?? {};
  const headerLogo = editorDocument.getElementById("header-logo");
  if (!RGBColor || !headerLogo) return;

  const headerColour = editorWindow.getComputedStyle(editorDocument.body).getPropertyValue(`--toolbar-header-${getEditorType()}`).trim();
  headerLogo.classList.toggle("logo-light", !new RGBColor(headerColour).isDark());
}

// onlyoffice paints the cached theme before it loads, so the cache needs the extended colours too or it flashes
function cacheExtendedColours({ themeId, themeType, themesExtended, extendedColours }) {
  let cachedTheme;
  try {
    cachedTheme = JSON.parse(editorWindow.localStorage.getItem("ui-theme"));
  } catch {
    return;
  }

  if (cachedTheme?.id !== themeId) return;

  // older versions cached the layout sizes too, so the cached colours get cleaned as well
  const themeColours = keepOnlyColours({ ...cachedTheme.colors, ...extendedColours });
  const skeletonCss = getSkeletonCss(themeColours, themesExtended, themeType);
  const earlyThemeCss = getEarlyThemeCss(themeId, themeColours);
  const skeleton = { ...cachedTheme.skeleton, css: `${cachedCssMarker}${skeletonCss}${earlyThemeCss}` };
  const extendedTheme = { ...cachedTheme, colors: themeColours, skeleton };
  editorWindow.localStorage.setItem("ui-theme", JSON.stringify(extendedTheme));
}

// the modern layout sizes and icon offsets break the icons until the modern class gets added, so only actual colours go in the cache
function keepOnlyColours(themeColours) {
  return Object.fromEntries(Object.entries(themeColours).filter(([, colourValue]) => /^(#|rgba?\()/.test(colourValue)));
}

// onlyoffices own dark theme css loads after the cached colours and wins, so the cached ones need !important until the plugin runs
function getEarlyThemeCss(themeId, themeColours) {
  const colourRules = Object.entries(themeColours).map(([colourName, colourValue]) => `--${colourName}:${colourValue} !important`);
  return `.${themeId}{${colourRules.join(";")}}`;
}

function removeCachedCss() {
  const cachedStyles = [...editorDocument.querySelectorAll("style")].filter(style => style.textContent.startsWith(cachedCssMarker));
  cachedStyles.forEach(style => style.remove());
}

// the loading screen before the editor loads, onlyoffice reads this css from the cache, one rule per editor so each gets its own colours
function getSkeletonCss(baseColours, themesExtended, themeType) {
  const modernLayoutColours = themesExtended?.modernLayout ? modernLayoutConfig[themeType] : {};

  return Object.entries(skeletonEditorSelectors).map(([editorType, skeletonSelector]) => {
    const themeColours = { ...baseColours, ...modernLayoutColours, ...themesExtended?.editorColors?.[editorType] };
    const skeletonColours = { ...skeletonColourConfig, "sk-background-toolbar": `toolbar-header-${editorType}` };

    const skeletonRules = Object.entries(skeletonColours)
      .filter(([, themeColourName]) => themeColours[themeColourName])
      .map(([skeletonColourName, themeColourName]) => `--${skeletonColourName}:${themeColours[themeColourName]} !important`);

    return `${skeletonSelector}{${skeletonRules.join(";")}}`;
  }).join("");
}

// the canvas eg around the page, rulers, sheet headers only gets painted when the theme loads
function repaintEditor(themeType, themeId) {
  const editorApi = editorWindow.Asc?.editor ?? editorWindow.editor;
  const editorStyle = editorWindow.getComputedStyle(editorDocument.body);
  const skinColours = Object.fromEntries(skinColourConfig.map(colourName => [colourName, editorStyle.getPropertyValue(`--${colourName}`).trim()]));

  editorApi?.asc_setSkin({ ...skinColours, type: themeType, name: themeId });
  editorWindow.dispatchEvent(new Event("resize"));
}

async function applyThemesExtended(theme) {
  // theme.name isnt the theme id, the editor itself has the real one
  const themeId = editorWindow.uitheme?.id ?? editorWindow.localStorage.getItem("ui-theme-id");
  let customTheme;
  try {
    customTheme = await getCustomTheme(themeId);
  } catch (error) {
    console.error("couldnt read themes.json", error);
    return;
  }

  const themesExtended = customTheme?.themesExtended;
  const isModern = themesExtended?.modernLayout || builtInModernThemes.includes(themeId);
  setModernIcons(Boolean(isModern));

  const themeType = customTheme?.type ?? theme?.type ?? editorWindow.uitheme?.type;
  const modernLayoutColours = themesExtended?.modernLayout ? modernLayoutConfig[themeType] : {};
  const editorColours = themesExtended?.editorColors?.[getEditorType()];
  const extendedColours = { ...modernLayoutColours, ...editorColours };
  const hasExtendedColours = Boolean(Object.keys(extendedColours).length);
  writeExtendedColours(extendedColours);

  // normal theme to normal theme, onlyoffice already painted it
  if (hasExtendedColours || hadExtendedColours) repaintEditor(themeType, themeId);
  hadExtendedColours = hasExtendedColours;

  updateLogo();

  removeCachedCss();
  cacheExtendedColours({ themeId, themeType, themesExtended, extendedColours });
}

function switchTheme(theme) {
  window.Asc.plugin.onThemeChangedBase(theme);
  applyThemesExtended(theme);
}

window.Asc.plugin.onThemeChanged = switchTheme;
window.Asc.plugin.init = () => applyThemesExtended();
window.Asc.plugin.button = () => {};
