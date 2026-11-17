const editorWindow = window.parent;
const editorDocument = editorWindow.document;

// custom themes only, built in ones arent in themes.json
async function getActiveTheme() {
  const versionPath = location.pathname.split("/").filter(Boolean)[0];
  const themesResponse = await fetch(`${location.origin}/${versionPath}/themes.json`);
  const { themes } = await themesResponse.json();

  return themes?.find(theme => theme.id === editorWindow.uitheme?.id);
}

// the class onlyoffice only gives its own modern themes, switches to the modern icons
function enableModernIcons() {
  editorDocument.documentElement.classList.add("theme-icons-cls-mod2");
  editorDocument.body.classList.add("theme-icons-cls-mod2");
}

function writeExtendedColours(extendedColours) {
  let extendedStyle = editorDocument.getElementById("themes-extended");
  if (!extendedStyle) {
    extendedStyle = editorDocument.createElement("style");
    extendedStyle.id = "themes-extended";
    editorDocument.head.appendChild(extendedStyle);
  }

  const colourRules = Object.entries(extendedColours).map(([colourName, colourValue]) => `--${colourName}:${colourValue} !important`);
  extendedStyle.textContent = `:root,body{${colourRules.join(";")}}`;
}

async function applyThemesExtended() {
  let activeTheme;
  try {
    activeTheme = await getActiveTheme();
  } catch (error) {
    console.error("couldnt read themes.json", error);
    return;
  }

  const themesExtended = activeTheme?.themesExtended;
  if (!themesExtended) return;

  const { modernLayout } = themesExtended;
  if (modernLayout) enableModernIcons();

  const modernLayoutColours = modernLayout ? modernLayoutConfig[activeTheme.type] : {};
  writeExtendedColours({ ...modernLayoutColours });
}

window.Asc.plugin.init = applyThemesExtended;
window.Asc.plugin.button = () => {};
