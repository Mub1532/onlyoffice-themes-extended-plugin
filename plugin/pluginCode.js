const editorWindow = window.parent;
const editorDocument = editorWindow.document;

let hadExtendedColours = false;

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
}

function switchTheme(theme) {
  window.Asc.plugin.onThemeChangedBase(theme);
  applyThemesExtended(theme);
}

window.Asc.plugin.onThemeChanged = switchTheme;
window.Asc.plugin.init = () => applyThemesExtended();
window.Asc.plugin.button = () => {};
