// onlyoffice's loading skeleton colours and the theme colours they come from, copied from its own night skeleton
const skeletonColourConfig = {
  "sk-background-toolbar-header-word": "toolbar-header-document",
  "sk-background-toolbar-header-cell": "toolbar-header-spreadsheet",
  "sk-background-toolbar-header-slide": "toolbar-header-presentation",
  "sk-background-toolbar-header-pdf": "toolbar-header-pdf",
  "sk-background-toolbar-controls": "background-toolbar",
  "sk-background-toolbar-tab": "highlight-header-button-hover",
  "sk-background-toolbar-button": "highlight-button-hover",
  "sk-canvas-background": "canvas-background",
  "sk-canvas-content-background": "canvas-content-background",
};

// each editor's loading skeleton has its own parts, pdf is the only one with none of them
const skeletonEditorSelectors = {
  document: ".loadmask:has(#sktoolbar)",
  spreadsheet: ".loadmask:has(.skformula)",
  presentation: ".loadmask:has(.slide-container)",
  pdf: ".loadmask:not(:has(#sktoolbar, .skformula, .slide-container))",
};
