const editorWindow = window.parent;

// custom themes only, built in ones arent in themes.json
async function getActiveTheme() {
  const versionPath = location.pathname.split("/").filter(Boolean)[0];
  const themesResponse = await fetch(`${location.origin}/${versionPath}/themes.json`);
  const { themes } = await themesResponse.json();

  return themes?.find(theme => theme.id === editorWindow.uitheme?.id);
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
}

window.Asc.plugin.init = applyThemesExtended;
window.Asc.plugin.button = () => {};
