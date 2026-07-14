import { create } from 'zustand';

const TUTORIAL_STORAGE_KEY = 'ucs:tutorialStep';

export const THEME_TUTORIAL_START_ID = 'themes-open-panel';
export const TEMPLATE_TUTORIAL_START_ID = 'templates-open-widget-menu';
export const AUTOMATION_TUTORIAL_START_ID = 'automation-intro';
export const VARIOUS_TUTORIAL_START_ID = 'various-open-gallery';

// Tutorial step definitions
export interface TutorialStep {
  id: string;
  title: string;
  message: string;
  targetSelector?: string;
  position: 'left' | 'right' | 'top' | 'bottom' | 'center';
  page: 'character-list' | 'sheet';
  requiresManualAdvance?: boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'create-character',
    title: 'Create Your First Character',
    message: 'Click the "Create New Character" button to get started with your first character sheet!',
    targetSelector: '[data-tutorial="create-character"]',
    position: 'bottom',
    page: 'character-list',
  },
  {
    id: 'name-character',
    title: 'Name Your Character',
    message: 'Type a name for your character. This can be anything you like!',
    targetSelector: '[data-tutorial="character-name-input"]',
    position: 'right',
    page: 'character-list',
  },
  {
    id: 'click-create',
    title: 'Create Your Character',
    message: 'This tour starts from a blank canvas. Keep the default theme for now and click Create—we\'ll build the sheet together.',
    targetSelector: '[data-tutorial="create-button"]',
    position: 'top',
    page: 'character-list',
  },
  {
    id: 'welcome-sheet',
    title: 'Welcome to Your Character Sheet!',
    message: 'This is where you\'ll build your character sheet. It\'s empty right now, so let\'s add some widgets! First, switch to Build.',
    targetSelector: '[data-tutorial="edit-mode-button"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'add-widget',
    title: 'Add Your First Widget',
    message: 'Click "Add Widget" to open the Add panel. It groups everything you can place on a sheet by what it helps you do.',
    targetSelector: '[data-tutorial="add-widget-button"], [data-tutorial="add-widget-button-mobile"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'add-image-widget',
    title: 'Add an Image Widget',
    message: 'Let\'s start with an Image widget! This is perfect for character portraits or reference images. Click on "Image" to add it.',
    targetSelector: '[data-tutorial="widget-IMAGE"]',
    position: 'right',
    page: 'sheet',
  },
  {
    id: 'add-health-widget',
    title: 'Add a Health Bar',
    message: 'Great! Now let\'s add a Health Bar to track your character\'s hit points. Click on "Health Bar".',
    targetSelector: '[data-tutorial="widget-HEALTH_BAR"]',
    position: 'right',
    page: 'sheet',
  },
  {
    id: 'add-form-widget',
    title: 'Add a Form Widget',
    message: 'Forms are great for character info like name, class, and background. Click on "Form" to add one.',
    targetSelector: '[data-tutorial="widget-FORM"]',
    position: 'right',
    page: 'sheet',
  },
  {
    id: 'add-number-display-widget',
    title: 'Add a Number Display',
    message: 'Finally, let\'s add a Number Display for stats like Armor Class or Speed. Click on "Number Display".',
    targetSelector: '[data-tutorial="widget-NUMBER_DISPLAY"]',
    position: 'right',
    page: 'sheet',
  },
  {
    id: 'close-toolbox',
    title: 'Close the Add Panel',
    message: 'Great job! You\'ve added some widgets. Now close the Add panel by clicking the X button to see your character sheet.',
    targetSelector: '[data-tutorial="close-toolbox"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'pan-camera',
    title: 'Move the Camera',
    message: 'You can pan around your character sheet by clicking and dragging on the background. Try moving the view around!',
    position: 'center',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'zoom-camera',
    title: 'Zoom In and Out',
    message: 'Use the scroll wheel (or pinch on touch devices) to zoom in and out. This helps you see details or get an overview!',
    position: 'center',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'fit-button',
    title: 'Fit All Widgets',
    message: 'Click the "Fit" button to automatically center and zoom to show all your widgets at once. Very useful after moving around!',
    targetSelector: '[data-tutorial="fit-button"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'move-widgets',
    title: 'Move Your Widgets',
    message: 'You can drag widgets around by clicking and holding the top bar (title area) of any widget. Try repositioning your widgets to create your ideal layout!',
    position: 'center',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'resize-widgets',
    title: 'Resize Your Widgets',
    message: 'Drag the bottom-right corner of any widget to resize it. Make widgets bigger or smaller to fit your needs!',
    position: 'center',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'attach-widgets',
    title: 'Attach Widgets Together',
    message: 'Move two widget edges close to each other and click the attach button that appears. Attached widgets will move together as a group, making it easy to organize your layout!',
    position: 'center',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'widget-menu',
    title: 'Widget Menu',
    message: 'Click the menu button (⋮) in the top-right corner of the Form widget to access options like Edit, Clone, Save as Template, and Delete.',
    targetSelector: '[data-tutorial="widget-menu-FORM"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'edit-widget',
    title: 'Edit Widget',
    message: 'Click "Edit" to open the widget editor. Here you can customize the widget\'s content, add fields, change labels, and more!',
    targetSelector: '[data-tutorial="edit-button-FORM"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'widget-label',
    title: 'Widget Title',
    message: 'You can rename the widget title here, or leave it empty if you don\'t want a title displayed.',
    targetSelector: '[data-tutorial="widget-label-input"]',
    position: 'bottom',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'form-type-field',
    title: 'Type a Field Name',
    message: 'Type a field name like "Class", "Background", or "Alignment" in the text box.',
    targetSelector: '[data-tutorial="form-field-input"]',
    position: 'top',
    page: 'sheet',
  },
  {
    id: 'form-click-add',
    title: 'Click Add',
    message: 'Click the "Add" button to add the field to your form.',
    targetSelector: '[data-tutorial="form-add-button"]',
    position: 'top',
    page: 'sheet',
  },
  {
    id: 'form-click-done',
    title: 'Finish Editing',
    message: 'You can keep adding more fields if you want! When you\'re done, click "Done" to save your changes.',
    targetSelector: '[data-tutorial="edit-done-button"]',
    position: 'top',
    page: 'sheet',
  },
  {
    id: 'load-complete-sheet',
    title: 'Let\'s Try a Complete Sheet!',
    message: 'Great job! Now let\'s load a pre-made character sheet with many different widgets so you can see what\'s possible. Click "Next" to load it!',
    position: 'center',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'switch-to-play',
    title: 'Switch to Play',
    message: 'This sheet has lots of widgets! Now switch to Play to use it at the table without the structural editing controls.',
    targetSelector: '[data-tutorial="edit-mode-button"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'try-widgets',
    title: 'Try It Out!',
    message: 'You\'re all set! Try clicking on different widgets - roll dice, track health, check conditions, and more. Have fun building your character sheets! 🎲',
    position: 'center',
    page: 'sheet',
  },
  {
    id: THEME_TUTORIAL_START_ID,
    title: 'Open Themes',
    message: 'This tutorial starts with a complete character sheet. Click Change Theme to open the theme panel.',
    targetSelector: '[data-tutorial="theme-button"], [data-tutorial="theme-button-mobile"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'themes-pick-theme',
    title: 'Try a Built-In Theme',
    message: 'Themes change the whole sheet: colors, borders, fonts, shadows, and textures. Pick one from the list to see it apply instantly.',
    targetSelector: '[data-tutorial="theme-option-medieval"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'themes-create-custom',
    title: 'Create a Custom Theme',
    message: 'You can also build your own theme from scratch, or copy a built-in theme with the pencil button and customize it.',
    targetSelector: '[data-tutorial="theme-create-custom"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'themes-share-custom',
    title: 'Share a Custom Theme',
    message: 'Saved custom theme cards have a Share button. Use it to open the same gallery submission dialog and share your theme with the community.',
    targetSelector: '[data-tutorial="theme-share-custom"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'themes-complete',
    title: 'Themes Tutorial Complete',
    message: 'That is the theme flow: load a sheet, open Themes, try built-in looks, and create custom styles when you want something personal.',
    position: 'center',
    page: 'sheet',
  },
  {
    id: TEMPLATE_TUTORIAL_START_ID,
    title: 'Create a Widget Template',
    message: 'Templates let you reuse widgets across character sheets. Start by opening the menu on this Form widget.',
    targetSelector: '[data-tutorial="widget-menu-FORM"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'templates-save-widget-template',
    title: 'Save the Widget',
    message: 'Choose Save as Template. This stores the widget layout and data so you can add another copy later.',
    targetSelector: '[data-tutorial="template-save-widget"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'templates-name-widget-template',
    title: 'Name the Template',
    message: 'Give the template a clear name, then click Save. It will appear at the bottom of the toolbox.',
    targetSelector: '[data-tutorial="template-widget-name-target"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'templates-open-toolbox',
    title: 'Open the Toolbox',
    message: 'Open Add Widget to find your saved templates below the standard widget list.',
    targetSelector: '[data-tutorial="add-widget-button"], [data-tutorial="add-widget-button-mobile"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'templates-load-widget-template',
    title: 'Load a Template',
    message: 'Scroll to Templates, then click your saved template to add it to this character sheet.',
    targetSelector: '[data-tutorial="template-load-item"]',
    position: 'right',
    page: 'sheet',
  },
  {
    id: 'templates-open-group-menu',
    title: 'Create a Group Template',
    message: 'You can save attached widgets as one reusable group. Open the Form widget menu again.',
    targetSelector: '[data-tutorial="widget-menu-FORM"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'templates-open-group-tab',
    title: 'Switch to Group Actions',
    message: 'Use the Group tab to work with the whole attached widget group instead of just one widget.',
    targetSelector: '[data-tutorial="template-group-tab"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'templates-save-group-template',
    title: 'Save the Group',
    message: 'Choose Save Group as Template here to store the attached widgets together.',
    targetSelector: '[data-tutorial="template-save-group"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'templates-name-group-template',
    title: 'Name the Group Template',
    message: 'Name the group template and save it. Loading it later will recreate the widgets and their attachments.',
    targetSelector: '[data-tutorial="template-group-name-target"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'templates-share-template',
    title: 'Share a Template',
    message: 'Template cards have a Share button. Use it to open the gallery submission dialog and share your widget or group template with the community.',
    targetSelector: '[data-tutorial="template-share-button"]',
    position: 'right',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'templates-complete',
    title: 'Templates Tutorial Complete',
    message: 'That is the template flow: save a widget, load it from the toolbox, save a group, and share templates with the community.',
    position: 'center',
    page: 'sheet',
  },
  {
    id: AUTOMATION_TUTORIAL_START_ID,
    title: 'What Is Automation?',
    message: 'Automations connect values so the sheet can do the math for you. For example, if you want to roll d20 + your Strength modifier, you can tag Strength once, then tell the dice roller to use that tag as its modifier.',
    position: 'center',
    page: 'character-list',
    requiresManualAdvance: true,
  },
  {
    id: 'automation-load-character',
    title: 'Load the Tutorial Character',
    message: 'Loading a tutorial character with a Strength attribute and a d20 dice roller.',
    position: 'center',
    page: 'character-list',
  },
  {
    id: 'automation-open-number-display-menu',
    title: 'Open the Stats Widget',
    message: 'A tutorial character is loaded. Open the menu on the Number Display widget that contains Strength.',
    targetSelector: '[data-tutorial="widget-menu-NUMBER_DISPLAY"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'automation-edit-number-display',
    title: 'Edit the Stats Widget',
    message: 'Choose Edit so we can assign a tag to the Strength attribute.',
    targetSelector: '[data-tutorial="edit-button-NUMBER_DISPLAY"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'automation-strength-tag-button',
    title: 'Tag Strength',
    message: 'Click the tag button on the Strength row. A tag gives this value a formula name.',
    targetSelector: '[data-tutorial="automation-strength-tag-button"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'automation-set-strength-tag',
    title: 'Name It str',
    message: 'Type str, then click Set. Other formulas can now read Strength by using @str.',
    targetSelector: '[data-tutorial="automation-strength-tag-target"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'automation-close-number-display',
    title: 'Close the Stats Editor',
    message: 'Click Done to return to the sheet. The Strength value is now available as @str.',
    targetSelector: '[data-tutorial="edit-done-button"]',
    position: 'top',
    page: 'sheet',
  },
  {
    id: 'automation-open-dice-menu',
    title: 'Open the Dice Roller',
    message: 'Now open the menu on the d20 dice roller. We will connect its modifier to Strength.',
    targetSelector: '[data-tutorial="widget-menu-DICE_ROLLER"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'automation-edit-dice-roller',
    title: 'Edit the Dice Roller',
    message: 'Choose Edit, then we will set the modifier formula.',
    targetSelector: '[data-tutorial="edit-button-DICE_ROLLER"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'automation-dice-formula-button',
    title: 'Add a Formula to the Modifier',
    message: 'Click the fx button beside Modifier. This makes the modifier calculated instead of manually typed.',
    targetSelector: '[data-tutorial="automation-dice-modifier-fx-button"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'automation-type-dice-formula',
    title: 'Use the Strength Tag',
    message: 'Type @str in the formula field. That tells the dice roller to use the current Strength value as its modifier.',
    targetSelector: '[data-tutorial="automation-dice-modifier-formula-target"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'automation-formula-operations',
    title: 'Formula Operations',
    message: 'Formulas can use + to add, - to subtract, * to multiply, / to divide, and parentheses for order. They also support floor(x), ceil(x), round(x), min(a,b), max(a,b), abs(x), IF(condition, trueValue, falseValue) with comparisons, SWITCH(value, case1, result1, default) with ranges like 1..5, THRESHOLD(value, @columnLabel, start), VALUE(@columnLabel, index, fallback), SUM(@columnLabel), and row-wise sums like SUM(@qty * @weight) for generated table-column labels.',
    position: 'center',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'automation-close-dice-roller',
    title: 'Close the Dice Editor',
    message: 'Click Done to return to the sheet. The dice roller is now automated.',
    targetSelector: '[data-tutorial="edit-done-button"]',
    position: 'top',
    page: 'sheet',
  },
  {
    id: 'automation-roll-dice',
    title: 'Roll the Dice',
    message: 'Roll the d20. The button should now include the Strength modifier from @str.',
    targetSelector: '[data-tutorial="automation-roll-dice"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'automation-change-strength',
    title: 'Change Strength',
    message: 'Click the Strength value and change it. When you confirm the new number, the dice roller modifier updates because it is reading @str.',
    targetSelector: '[data-tutorial="automation-strength-value"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'automation-complete',
    title: 'Automation Tutorial Complete',
    message: 'That is the automation loop: tag a source value, use @tag in another widget formula, then let the sheet keep the connected values in sync.',
    position: 'center',
    page: 'sheet',
  },
  {
    id: VARIOUS_TUTORIAL_START_ID,
    title: 'Open the Gallery',
    message: 'The Various tutorial covers tools that do not fit into the other tutorials. Start by opening the Community Gallery.',
    targetSelector: '[data-tutorial="gallery-button-mobile"], [data-tutorial="gallery-button"]',
    position: 'bottom',
    page: 'character-list',
  },
  {
    id: 'various-gallery-concepts',
    title: 'Browse by Asset Type',
    message: 'Browse complete Presets, visual Themes, or reusable widget Templates. Use the categories and search to narrow the community library.',
    targetSelector: '[data-tutorial="gallery-concepts"]',
    position: 'left',
    page: 'character-list',
    requiresManualAdvance: true,
  },
  {
    id: 'various-gallery-manage',
    title: 'Manage My Library',
    message: 'My Library contains assets saved on this device. Import your own, or use each item menu to share, export, or remove it.',
    targetSelector: '[data-tutorial="gallery-manage-data"]',
    position: 'left',
    page: 'character-list',
    requiresManualAdvance: true,
  },
  {
    id: 'various-gallery-download',
    title: 'Add from the Community',
    message: 'Select Add on any community asset to save it to My Library, where it becomes available throughout UCS.',
    targetSelector: '[data-tutorial="gallery-download"]',
    position: 'left',
    page: 'character-list',
    requiresManualAdvance: true,
  },
  {
    id: 'various-open-backup',
    title: 'Open Backup',
    message: 'Next, open Backup and Restore.',
    targetSelector: '[data-tutorial="backup-button-mobile"], [data-tutorial="backup-button"]',
    position: 'bottom',
    page: 'character-list',
  },
  {
    id: 'various-backup-overview',
    title: 'Back Up Regularly',
    message: 'Download backups regularly. Your data is stored in this browser, and this is where you can restore from a backup file if you change devices, browsers, or lose local storage.',
    targetSelector: '[data-tutorial="backup-modal"]',
    position: 'right',
    page: 'character-list',
    requiresManualAdvance: true,
  },
  {
    id: 'various-feedback',
    title: 'Send Feedback',
    message: 'Use Feedback to report bugs or request new features. It is the best place to tell us what is broken, confusing, or missing.',
    targetSelector: '[data-tutorial="feedback-button"]',
    position: 'bottom',
    page: 'character-list',
    requiresManualAdvance: true,
  },
  {
    id: 'various-print-mode',
    title: 'Print Preview',
    message: 'Print Preview prepares the current sheet for paper or PDF, with controls for paper format and simplified styling.',
    targetSelector: '[data-tutorial="print-mode-button-mobile"], [data-tutorial="print-mode-button"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'various-print-overview',
    title: 'Print Tools',
    message: 'In Print Preview you can adjust the print area and use the print controls. This is only a quick stop for this tutorial.',
    targetSelector: '[data-tutorial="print-toolbar"]',
    position: 'bottom',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'various-vertical-view',
    title: 'List Layout',
    message: 'The List layout presents widgets as a single column in Play. It is especially useful on phones and narrow screens.',
    targetSelector: '[data-tutorial="vertical-view-button-mobile"], [data-tutorial="vertical-view-button"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'various-vertical-overview',
    title: 'Vertical Layout',
    message: 'This view keeps the same widgets but makes them easier to scan on mobile. You can return to Grid View when you want the canvas layout again.',
    position: 'center',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'various-timeline',
    title: 'Timeline',
    message: 'Timeline records notable sheet activity, such as rolls and automated formula changes, so you can review what happened during play.',
    targetSelector: '[data-tutorial="timeline-button-mobile"], [data-tutorial="timeline-button"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'various-timeline-overview',
    title: 'Timeline Panel',
    message: 'Timeline groups activity by day. Search the log, choose its order, show or hide formula changes, and undo accidental deletes or clears.',
    targetSelector: '[data-tutorial="timeline-panel"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'various-add-sheets',
    title: 'Multiple Sheets',
    message: 'A character can have multiple sheets. Open the sheet selector to switch sheets, rename them, delete extra sheets, or add a new sheet.',
    targetSelector: '[data-tutorial="sheet-selector"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'various-add-sheet-button',
    title: 'Add a Sheet',
    message: 'Use Add New Sheet when you want another page for inventory, spells, notes, companions, vehicles, or anything else your character needs.',
    targetSelector: '[data-tutorial="add-sheet-button"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'various-complete',
    title: 'Various Tutorial Complete',
    message: 'That is the tour of gallery sharing and downloads, backups, feedback, Print Preview, the List layout, timeline, and multiple sheets.',
    position: 'center',
    page: 'sheet',
  },
];

interface TutorialState {
  tutorialStep: number | null;
  startTutorial: () => void;
  startThemesTutorial: () => void;
  startTemplatesTutorial: () => void;
  startAutomationTutorial: () => void;
  startVariousTutorial: () => void;
  exitTutorial: () => void;
  advanceTutorial: () => void;
  setTutorialStep: (step: number | null) => void;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  tutorialStep: null,

  startTutorial: () => {
    set({ tutorialStep: 0 });
    localStorage.setItem(TUTORIAL_STORAGE_KEY, '0');
  },

  startThemesTutorial: () => {
    const themeTutorialStart = TUTORIAL_STEPS.findIndex((step) => step.id === THEME_TUTORIAL_START_ID);
    const tutorialStep = themeTutorialStart >= 0 ? themeTutorialStart : 0;
    set({ tutorialStep });
    localStorage.setItem(TUTORIAL_STORAGE_KEY, String(tutorialStep));
  },

  startTemplatesTutorial: () => {
    const templateTutorialStart = TUTORIAL_STEPS.findIndex((step) => step.id === TEMPLATE_TUTORIAL_START_ID);
    const tutorialStep = templateTutorialStart >= 0 ? templateTutorialStart : 0;
    set({ tutorialStep });
    localStorage.setItem(TUTORIAL_STORAGE_KEY, String(tutorialStep));
  },

  startAutomationTutorial: () => {
    const automationTutorialStart = TUTORIAL_STEPS.findIndex((step) => step.id === AUTOMATION_TUTORIAL_START_ID);
    const tutorialStep = automationTutorialStart >= 0 ? automationTutorialStart : 0;
    set({ tutorialStep });
    localStorage.setItem(TUTORIAL_STORAGE_KEY, String(tutorialStep));
  },

  startVariousTutorial: () => {
    const variousTutorialStart = TUTORIAL_STEPS.findIndex((step) => step.id === VARIOUS_TUTORIAL_START_ID);
    const tutorialStep = variousTutorialStart >= 0 ? variousTutorialStart : 0;
    set({ tutorialStep });
    localStorage.setItem(TUTORIAL_STORAGE_KEY, String(tutorialStep));
  },

  exitTutorial: () => {
    set({ tutorialStep: null });
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
  },

  advanceTutorial: () => {
    const { tutorialStep } = get();
    if (tutorialStep !== null && tutorialStep < TUTORIAL_STEPS.length - 1) {
      const newStep = tutorialStep + 1;
      set({ tutorialStep: newStep });
      localStorage.setItem(TUTORIAL_STORAGE_KEY, String(newStep));
    } else {
      set({ tutorialStep: null });
      localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    }
  },

  setTutorialStep: (step: number | null) => {
    set({ tutorialStep: step });
    if (step !== null) {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, String(step));
    } else {
      localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    }
  },
}));

// Initialize from localStorage
const storedStep = localStorage.getItem(TUTORIAL_STORAGE_KEY);
if (storedStep !== null) {
  useTutorialStore.setState({ tutorialStep: parseInt(storedStep, 10) });
}
