import { create } from 'zustand';

const TUTORIAL_STORAGE_KEY = 'ucs:tutorialStep';

export const THEME_TUTORIAL_START_ID = 'themes-open-panel';
export const TEMPLATE_TUTORIAL_START_ID = 'templates-open-widget-menu';
export const AUTOMATION_TUTORIAL_START_ID = 'automation-intro';
export const ADVANCED_AUTOMATION_TUTORIAL_START_ID = 'advanced-intro';
export const EVENTS_TUTORIAL_START_ID = 'events-intro';
export const VARIOUS_TUTORIAL_START_ID = 'various-open-gallery';
export const COMPENDIUM_TUTORIAL_START_ID = 'compendium-intro';

// Tutorial step definitions
export interface TutorialStep {
  id: string;
  title: string;
  message: string;
  targetSelector?: string;
  scrollTargetIntoView?: boolean;
  position: 'left' | 'right' | 'top' | 'bottom' | 'center';
  dock?: 'top';
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
    id: 'add-widget',
    title: 'Add Your First Widget',
    message: 'Your sheet is empty, so let\'s add some widgets. Select the highlighted Add button to open the panel. It groups everything you can place on a sheet by what it helps you do.',
    targetSelector: '[data-tutorial="add-widget-button"], [data-tutorial="add-widget-button-mobile"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'add-image-widget',
    title: 'Add an Image Widget',
    message: 'Select Image to add a place for a character portrait or reference image. You can choose the image from the widget afterward.',
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
    message: 'Your starter widgets are ready. Use the highlighted X to close the Add panel and see the whole sheet.',
    targetSelector: '[data-tutorial="close-toolbox"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'pan-camera',
    title: 'Move the Camera',
    message: 'Drag an empty part of the canvas to pan around the sheet. Move it a little, then choose Next.',
    position: 'center',
    dock: 'top',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'zoom-camera',
    title: 'Zoom In and Out',
    message: 'Use the scroll wheel, the zoom controls, or a pinch gesture to change scale. Try it, then choose Next.',
    position: 'center',
    dock: 'top',
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
    message: 'With a mouse, hover a widget and drag the grip on its top edge. On touch, press and hold a widget until it lifts, then drag it. Give one a move, then choose Next.',
    position: 'center',
    dock: 'top',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'resize-widgets',
    title: 'Resize Your Widgets',
    message: 'With a mouse, drag any edge or corner of a widget. On touch, press and hold a widget, let go, then drag a corner handle. Try a small adjustment, then choose Next.',
    position: 'center',
    dock: 'top',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'attach-widgets',
    title: 'Attach Widgets Together',
    message: 'Optional: line up a widget\'s edge against another widget, then select it and use the link button that appears on the shared edge. Attached widgets move as a group.',
    position: 'center',
    dock: 'top',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'widget-menu',
    title: 'Widget Menu',
    message: 'Click the highlighted menu button (⋮) on the Form widget to access options like Edit, Clone, Save as Template, and Delete. It appears on any selected widget, and right-clicking a widget opens the same menu.',
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
    id: 'try-widgets',
    title: 'Try It Out!',
    message: 'You\'re ready to explore. Roll dice, track health, toggle conditions, and adjust values. This tutorial sheet is temporary, so experiment freely.',
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
    message: 'Open the actions menu (⋮) on a saved custom theme and choose Share. It opens the gallery submission dialog so you can share your theme with the community.',
    targetSelector: '[data-tutorial="theme-share-custom"], [data-tutorial="theme-custom-actions"]',
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
    title: 'Automations',
    message: 'Take a short tour of Effects, Labels, Formulas and Events. You will use a ready-made ring to see how the types work together. The tutorial character is temporary, so experiment freely.',
    position: 'center',
    page: 'character-list',
    requiresManualAdvance: true,
  },
  {
    id: 'automation-load-character',
    title: 'Load the Tutorial Character',
    message: 'Loading a small sheet with Strength, a ring, a calculated Defense value and one sample event.',
    position: 'center',
    page: 'character-list',
  },
  {
    id: 'automation-open-panel',
    title: 'Open Automations',
    message: 'Open Automations from the toolbar. This panel gathers all four types across every sheet of your character.',
    targetSelector: '[data-tutorial="automations-button-mobile"], [data-tutorial="automations-button"]',
    position: 'bottom', page: 'sheet',
  },
  {
    id: 'automation-panel-overview',
    title: 'One Panel, Four Tabs',
    message: 'Effects apply reversible adjustments. Labels name values. Formulas calculate values. Events react to actions. Each tab has search, filters and its own tools.',
    targetSelector: '#automations-panel [role="tablist"]',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'automation-effects-overview',
    title: 'Effects: Bonuses and Penalties',
    message: 'The ring adds +2 to Strength while active. The card shows its source and target; click either to find it on the sheet. Add Effects in an item or supported widget editor by choosing a target value directly. No label or event is needed.',
    targetSelector: '#automations-content-effects',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'automation-activate-effect',
    title: 'Activate the Ring',
    message: 'Turn on the ring with this switch. The same switch is available on its inventory card.',
    targetSelector: '[data-tutorial="automation-effect-toggle"]',
    scrollTargetIntoView: true, position: 'left', page: 'sheet', dock: 'top',
  },
  {
    id: 'automation-effects-result',
    title: 'A Reversible Adjustment',
    message: 'Strength went from 10 to 12, and Defense recalculated from 11 to 13. Turning the ring off removes its +2. Effects can also adjust a formula result without changing the formula, and normally respect value limits.',
    targetSelector: '#automations-content-effects',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'automation-labels-overview',
    title: 'Labels: Names for Values',
    message: 'Strength is named str, so formulas read it as @str. A label is not the visible title of a stat: it is its reference name. Use the tag button beside a value in a widget editor to add one; the Labels tab lets you inspect and manage them.',
    targetSelector: '[data-tutorial="labels-panel"]',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'automation-labels-standalone',
    title: 'Standalone Labels',
    message: '@proficiency is a standalone value, not part of a widget. Use Add label to create one and New section to organize them. Click a label to inspect it. Renaming a label can update formulas that reference it.',
    targetSelector: '[data-tutorial="labels-standalone"]',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'automation-formulas-overview',
    title: 'Formulas: Connected Calculations',
    message: 'Defense uses @str + 1 instead of a manually typed value. The Formulas tab shows where calculations are used and whether they need attention. Click the pencil to inspect this formula.',
    targetSelector: '[data-tutorial="automation-edit-formula"]',
    scrollTargetIntoView: true, position: 'left', page: 'sheet', dock: 'top',
  },
  {
    id: 'automation-formula-editor',
    title: 'A Simple Formula',
    message: '@str + 1 reads the final Strength value and adds one. The result previews below Expression, and labels can be inserted from the list. Click Apply formula to keep it. The separate Formulas tutorial covers the expressions in depth.',
    targetSelector: '[data-tutorial-formula-apply="true"]',
    position: 'top', page: 'sheet', dock: 'top',
  },
  {
    id: 'automation-formulas-result',
    title: 'Always Up to Date',
    message: 'The ring changes Strength; the formula then recalculates Defense. You do not have to copy numbers between widgets. You cannot type directly over a formula-controlled value, but Effects can add a final bonus or penalty.',
    targetSelector: '#automations-content-formulas',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'automation-events-brief',
    title: 'Events: When Something Happens',
    message: 'Events have a trigger and ordered actions, optionally with a condition. Practice message runs only when you press Play and logs the current Strength. Unlike a reversible Effect, an Event performs an action once. The Events tutorial covers triggers, rolls and chains.',
    targetSelector: '[data-tutorial="events-panel"]',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'automation-complete',
    title: 'Automations Tour Complete',
    message: 'Use Effects for reversible bonuses, Labels for reference names, Formulas for calculations, and Events for actions. Continue with Formulas for expressions, tables and inline text, or Events for reactive workflows.',
    position: 'center',
    page: 'sheet',
  },
  {
    id: ADVANCED_AUTOMATION_TUTORIAL_START_ID,
    title: 'Formulas',
    message: 'Go deeper into expressions, conditions and math, then use a live table with column formulas and SUM. Finish with formulas inside text. Strength is already labeled @str; the Automations tour explains labels if you are new to them.',
    position: 'center',
    page: 'character-list',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-load-character',
    title: 'Load the Tutorial Character',
    message: 'Loading Strength, an Attack roller, a Cargo table, a Total Load tracker and example notes.',
    position: 'center',
    page: 'character-list',
  },
  {
    id: 'advanced-open-dice-menu',
    title: 'Open the Dice Roller',
    message: 'Open the menu on the Attack dice roller. We will give its modifier a formula.',
    targetSelector: '[data-tutorial="widget-menu-DICE_ROLLER"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'advanced-edit-dice-roller',
    title: 'Edit the Dice Roller',
    message: 'Choose Edit to open the dice roller settings.',
    targetSelector: '[data-tutorial="edit-button-DICE_ROLLER"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'advanced-open-formula-editor',
    title: 'Open the Formula Editor',
    message: 'Click the fx button beside Modifier to open the formula editor.',
    targetSelector: '[data-tutorial="automation-dice-modifier-fx-button"]',
    scrollTargetIntoView: true,
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'advanced-formula-overview',
    title: 'The Formula Editor',
    message: 'This is where formulas are written. Type in the Expression box and the result appears live under it. When something is wrong, the editor underlines the problem and explains it.',
    targetSelector: '[data-tutorial="formula-expression"]',
    position: 'bottom',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-formula-labels',
    title: 'Available Labels',
    message: 'Every labeled value on your character is listed here, such as @str. Click one to insert it. A formula reads the final value, including active Effects. Missing labels and circular references are reported rather than accepted.',
    targetSelector: '[data-tutorial="formula-labels"]',
    position: 'right',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-formula-reference',
    title: 'Symbols and Commands',
    message: 'Everything a formula can do is grouped here: Operators, Text, Conditions, Math and Tables. Click any item to see its syntax and examples. The next steps visit each group.',
    targetSelector: '[data-tutorial="formula-reference"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-formula-arithmetic',
    title: 'Operators',
    message: 'The editor typed (@str + 4) * 2 for you. With Strength at 10 the result is 28. Use + - * / and parentheses; multiplication and division are calculated first. Edit the formula to experiment.',
    targetSelector: '[data-tutorial="formula-expression"]',
    position: 'bottom',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-formula-conditions',
    title: 'Conditions with IF',
    message: 'IF(@str >= 10, 2, 0) gives 2 when Strength is 10 or more, and 0 otherwise. You can compare with = <> < > <= >=, and nest IF inside IF.',
    targetSelector: '[data-tutorial="formula-expression"]',
    position: 'bottom',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-formula-switch',
    title: 'SWITCH and Ranges',
    message: 'SWITCH(@str, 1..9, 0, 10..14, 1, 2) picks a result by value. 1..9 is a range, and the final 2 is the default. It is ideal for bonus tables.',
    targetSelector: '[data-tutorial="formula-expression"]',
    position: 'bottom',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-formula-math',
    title: 'Math Functions',
    message: 'max(0, min(@str, 8)) caps Strength at 8 and never goes below 0. You also have floor, ceil and round to round numbers, and abs for the distance from zero.',
    targetSelector: '[data-tutorial="formula-expression"]',
    position: 'bottom',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-formula-rounding',
    title: 'Rounding and Absolute Values',
    message: 'round((@str + 3) / 2) gives 7. floor rounds 6.5 down to 6, ceil rounds it up to 7, and abs(-3) gives 3. Functions can be nested, as in max(0, floor((@str - 10) / 2)).',
    targetSelector: '[data-tutorial="formula-expression"]',
    position: 'bottom', page: 'sheet', requiresManualAdvance: true,
  },
  {
    id: 'advanced-formula-text',
    title: 'Text',
    message: '"Level " + @level joins text and numbers into "Level 3". This numeric modifier only accepts numbers, but text fields and inline formulas accept text results. We will see a working example in the notes.',
    targetSelector: '[data-tutorial="formula-reference"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-formula-errors',
    title: 'When a Formula Is Broken',
    message: 'The editor typed the unfinished formula @str + . Notice the underlined problem and the message under the box. Add a number after the + and the error disappears.',
    targetSelector: '[data-tutorial="formula-expression"]',
    position: 'bottom',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-apply-formula',
    title: 'Use the Formula',
    message: 'The editor typed floor((@str - 10) / 2), the classic ability modifier. Click Apply formula to use it as the Attack modifier.',
    targetSelector: '[data-tutorial="automation-dice-modifier-formula-target"]',
    position: 'top',
    page: 'sheet',
  },
  {
    id: 'advanced-close-dice-roller',
    title: 'Close the Dice Editor',
    message: 'Click Done to return to the sheet.',
    targetSelector: '[data-tutorial="edit-done-button"]',
    position: 'top',
    page: 'sheet',
  },
  {
    id: 'advanced-table-overview',
    title: 'A Working Table',
    message: 'Cargo has three rows of Qty and Weight. Load multiplies them per row: 6, 4 and 1.5. Total Load adds those results to 11.5. Tables can supply values to any other widget, not just display text.',
    targetSelector: '.canvas-widget[data-tutorial="widget-TABLE"]',
    position: 'right', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'advanced-table-labels',
    title: 'Column Labels and Formulas',
    message: 'Qty is labeled qty, generating @qty1, @qty2 and @qty3. The first Load cell uses @qty1 * @weight1; the other rows use their numbered labels. Select a cell or column heading to access its tag and fx buttons. Row and column formulas repeat the same expression; a cell formula overrides a row formula, then a column formula.',
    targetSelector: '.canvas-widget[data-tutorial="widget-TABLE"]',
    position: 'right', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'advanced-table-open-formulas',
    title: 'Inspect the Total',
    message: 'Open Automations to inspect Total Load in the Formulas tab.',
    targetSelector: '[data-tutorial="automations-button-mobile"], [data-tutorial="automations-button"]',
    position: 'bottom', page: 'sheet',
  },
  {
    id: 'advanced-table-edit-total',
    title: 'Edit Total Load',
    message: 'Click the pencil for Total load. Its formula SUM(@load) adds every numbered value from the Load column.',
    targetSelector: '[data-tutorial="advanced-table-edit-formula"]',
    scrollTargetIntoView: true, position: 'left', page: 'sheet', dock: 'top',
  },
  {
    id: 'advanced-table-sum',
    title: 'SUM a Column',
    message: 'SUM(@qty) gives 6: 2 + 1 + 3. @qty is a column prefix here, not one cell. Use @qty1 when you only want the first row.',
    targetSelector: '[data-tutorial="formula-expression"]',
    position: 'bottom', page: 'sheet', requiresManualAdvance: true,
  },
  {
    id: 'advanced-table-sum-expression',
    title: 'SUM an Expression',
    message: 'SUM(@qty * @weight) calculates each row before adding: 2*3 + 1*4 + 3*0.5 = 11.5. This is useful for inventory weight, prices or other per-row calculations.',
    targetSelector: '[data-tutorial="formula-expression"]',
    position: 'bottom', page: 'sheet', requiresManualAdvance: true,
  },
  {
    id: 'advanced-table-lookup',
    title: 'Look Up a Row',
    message: 'VALUE(@weight, 2) reads the second Weight value, 4. Its optional third argument is a fallback for a missing row. THRESHOLD is also available for counting reached breakpoints in a labeled table column; select it in the reference to explore its syntax.',
    targetSelector: '[data-tutorial="formula-expression"]',
    position: 'bottom', page: 'sheet', requiresManualAdvance: true,
  },
  {
    id: 'advanced-table-apply',
    title: 'Keep the Weighted Total',
    message: 'The editor restored SUM(@qty * @weight). Click Apply formula so Total Load now calculates directly from those two columns.',
    targetSelector: '[data-tutorial-formula-apply="true"]',
    position: 'top', page: 'sheet', dock: 'top',
  },
  {
    id: 'advanced-table-change',
    title: 'Change the Table',
    message: 'Double-click the first Qty cell, change 2 to 3, then press Enter. Load should become 9 for that row, and Total Load should become 14.5. Choose Next after trying it.',
    targetSelector: '.canvas-widget[data-tutorial="widget-TABLE"]',
    position: 'right', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'advanced-table-result',
    title: 'The Total Follows the Table',
    message: 'The tracker recalculates whenever referenced cells change. Cell formulas handle individual rows; SUM combines rows into one result. Generated column labels are also available to conditions and Events.',
    targetSelector: '.canvas-widget[data-tutorial="widget-NUMBER"]',
    position: 'right', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'advanced-inline-notes',
    title: 'Formulas in Text',
    message: 'Curly braces calculate inside text: {@str + 10} shows 20, {SUM(@qty * @weight)} shows the current Cargo load, and {"Level " + @level} shows Level 3. These examples update with the sheet and also work in titles, field names and tooltips.',
    targetSelector: '.canvas-widget[data-tutorial="widget-TEXT"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-inline-dice-roll',
    title: 'Dice in Text',
    message: 'A dice expression in braces becomes a roll button instead of a fixed calculation. The notes use {1d20 + floor((@str - 10) / 2)}. Click its dice icon to roll. Other examples include 2d20kh to keep the higher die or 4d6dl to drop the lowest.',
    targetSelector: '.canvas-widget[data-tutorial="widget-TEXT"] .inline-dice-token',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'advanced-inline-dice-result',
    title: 'The Roll Result',
    message: 'The roll result opens over the widget. Expressions such as {@level}d6 can use a formula for the dice count. To display braces literally instead of calculating or rolling, double them: {{not a formula}}. Choose Next to finish.',
    targetSelector: '.dice-result-dialog',
    position: 'bottom',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-complete',
    title: 'Formulas Tutorial Complete',
    message: 'You explored expressions and validation, applied a formula, used generated table labels with SUM and VALUE, and calculated inside text. Use the Automations tour for Effects and labels, or Events for actions that react to these values.',
    position: 'center',
    page: 'sheet',
  },
  {
    id: EVENTS_TUTORIAL_START_ID,
    title: 'Events',
    message: 'Events make your sheet react on its own: when something happens, they do something for you. You will set off ready-made events, run one by hand, follow a chain in the timeline, build an event that uses the result of a roll, then start events with buttons.',
    position: 'center',
    page: 'character-list',
    requiresManualAdvance: true,
  },
  {
    id: 'events-load-character',
    title: 'Load the Tutorial Character',
    message: 'Loading a tutorial character that already has four events.',
    position: 'center',
    page: 'character-list',
  },
  {
    id: 'events-open-panel',
    title: 'Open Automations',
    message: 'Open Automations from the toolbar. Every event on this character lives in its Events tab.',
    targetSelector: '[data-tutorial="automations-button-mobile"], [data-tutorial="automations-button"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'events-panel-overview',
    title: 'The Events Tab',
    message: 'Each card is one event. Search by name, widget or label, and filter to see the events that are on, off or need attention. When one change sets off several events, they run from top to bottom.',
    targetSelector: '[data-tutorial="events-panel"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'events-card',
    title: 'Read an Event',
    message: 'An event reads like a sentence. When Health drops below half, Bloodied turns on Frightened and writes a message in the timeline. Hover a widget name to highlight that widget on the sheet, or click it to jump there.',
    targetSelector: '[data-tutorial="event-card"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'events-actions-overview',
    title: 'Event Actions Are Not Reversible Effects',
    message: 'An Event performs its actions when triggered: heal, spend a resource, change a condition, roll dice or write a message. These actions are different from the ongoing bonuses in the Effects tab. Formulas supply final values to Events, but a numeric action cannot overwrite a formula-controlled value.',
    targetSelector: '[data-tutorial="event-card"]',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'events-try-trigger',
    title: 'Set Off Bloodied',
    message: 'Health is at 9 of 10. Click Damage and deal 5 or more to drop it below half.',
    targetSelector: '.canvas-widget[data-tutorial="widget-HEALTH_BAR"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'events-timeline',
    title: 'Follow It in the Timeline',
    message: 'Frightened is on now. The timeline logs Bloodied with each action, and its message shows the HP it passed along. Click an event name to find it in the Events panel. Undo reverts the damage and everything the event did, together.',
    targetSelector: '[data-tutorial="timeline-panel"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'events-run-manual',
    title: 'Run an Event by Hand',
    message: 'Second Wind has no trigger. It only runs when you press Run. Click Run to heal 1d10+4.',
    targetSelector: '[data-tutorial="event-run-manual"]',
    scrollTargetIntoView: true,
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'events-chain',
    title: 'Events Set Off Events',
    message: 'Second Wind brought Health back to half or more, so Steady again fired too and turned Frightened off. An event set off by another event is marked ↳. Each event fires at most once per chain, so events can\'t loop forever.',
    targetSelector: '[data-tutorial="timeline-panel"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'events-card-controls',
    title: 'Card Controls',
    message: 'The switch turns an event off without deleting it. Play runs it right away, whatever its trigger. The pencil edits it, and ⋮ duplicates, reorders or deletes it. A card that needs attention, such as one whose widget was deleted, is outlined in amber.',
    targetSelector: '[data-tutorial="event-card"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'events-new',
    title: 'Build Your Own',
    message: 'Now build an event that reacts to an attack roll. Click New event.',
    targetSelector: '[data-tutorial="events-new"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'events-editor-trigger',
    title: 'When: the Trigger',
    message: 'Every event starts with a trigger: pick a widget, then what to watch for. Each widget offers its own triggers. We named this event Hit and picked the Attack roller: when its dice are rolled.',
    targetSelector: '[data-tutorial="event-editor-trigger"]',
    scrollTargetIntoView: true,
    position: 'right',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'events-editor-data',
    title: 'Data from the Trigger',
    message: 'A trigger passes along what happened. This one passes the roll as @event_total, @event_highest and @event_lowest. Use them in a condition or action like any other label. Click a chip to insert it where you were typing. These event labels only exist while this event runs.',
    targetSelector: '[data-tutorial="event-editor-data"]',
    scrollTargetIntoView: true,
    position: 'right',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'events-editor-condition',
    title: 'Only If: the Condition',
    message: 'A condition is optional. When it is set, the event only fires if the formula is true. We added @event_total >= 12, so only a total of 12 or more is a hit.',
    targetSelector: '[data-tutorial="event-editor-condition"]',
    scrollTargetIntoView: true,
    position: 'right',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'events-editor-effects',
    title: 'Then: Ordered Actions',
    message: 'Actions run in order. We added two: roll the Damage dice, then write "Hit with a {@event_total}!" in the timeline. Braces show formula values in text. The editor calls an action an effect: use Add effect for another action, or add a step with its own condition.',
    targetSelector: '[data-tutorial="event-editor-effects"]',
    scrollTargetIntoView: true,
    position: 'right',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'events-editor-save',
    title: 'Save the Event',
    message: 'Click Create event. If something is missing, the editor points to it.',
    targetSelector: '[data-tutorial="event-editor-save"]',
    position: 'right',
    page: 'sheet',
  },
  {
    id: 'events-try-new',
    title: 'Roll to Hit',
    message: 'Roll the Attack dice. On a total of 12 or more, Hit rolls the Damage dice.',
    targetSelector: '[data-tutorial="automation-roll-dice"]',
    position: 'bottom',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'events-try-new-result',
    title: 'Check the Result',
    message: 'On a hit of 12 or more, the timeline shows the Damage roll and your message. On a miss, Hit is logged as "condition not met" and does nothing else. You can roll again later to see the other outcome.',
    targetSelector: '[data-tutorial="timeline-panel"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'events-open-widget-menu',
    title: 'Events in Widget Settings',
    message: 'Widget settings also list the events that use the widget. Open the menu on the Attack dice roller.',
    targetSelector: '[data-tutorial="widget-menu-DICE_ROLLER"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'events-edit-widget',
    title: 'Edit the Dice Roller',
    message: 'Choose Edit to open the dice roller settings.',
    targetSelector: '[data-tutorial="edit-button-DICE_ROLLER"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'events-widget-section',
    title: 'The Events Section',
    message: 'Hit is listed here because it uses this roller. Turn it on or off, edit it, or start a new event with this widget already picked. For a widget without events, this section lists what its events can do.',
    targetSelector: '[data-tutorial="widget-events-section"]',
    scrollTargetIntoView: true,
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'events-close-widget',
    title: 'Close the Dice Editor',
    message: 'Click Done to return to the sheet. Events don\'t run while a widget is being edited.',
    targetSelector: '[data-tutorial="edit-done-button"]',
    position: 'top',
    page: 'sheet',
  },
  {
    id: 'events-button-widget',
    title: 'Event Buttons',
    message: 'An Event button runs its events when you press it. Add one from Add Widget like any other widget. This one runs Rage, which spends a Rage flame from the pool. Press Rage.',
    targetSelector: '.canvas-widget[data-tutorial="widget-EVENT_BUTTON"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'events-button-result',
    title: 'What the Button Did',
    message: 'For a moment the button shows what happened: one Rage flame is gone from the pool. A new Event button offers Add event right on its face, so you can set up what it does in one click.',
    targetSelector: '.canvas-widget[data-tutorial="widget-EVENT_BUTTON"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'events-inline-button',
    title: 'Buttons in Text',
    message: 'Text can hold buttons too: write a name in square brackets inside curly braces. The Spells table has {[Fireball]}, so Fireball shows as a button. Its dashed outline means it does nothing yet. Click Fireball to choose what it does.',
    targetSelector: '[data-tutorial="inline-event-button"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'events-inline-editor-effects',
    title: 'Set Up Fireball',
    message: 'The first click filled in the name and trigger: when Fireball in Spells is pressed. We added two ordered actions: use a level 3 spell slot, then roll 8d6 for damage. Dice expressions can include arithmetic, labels and formulas, as in 2d6 + @str or {@level}d6.',
    targetSelector: '[data-tutorial="event-editor-effects"]',
    scrollTargetIntoView: true,
    position: 'right',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'events-inline-editor-save',
    title: 'Save Fireball',
    message: 'Click Create event.',
    targetSelector: '[data-tutorial="event-editor-save"]',
    position: 'right',
    page: 'sheet',
  },
  {
    id: 'events-inline-try',
    title: 'Cast Fireball',
    message: 'The outline is solid now, so the button is ready. Click Fireball to cast it.',
    targetSelector: '[data-tutorial="inline-event-button"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'events-inline-result',
    title: 'Fireball Cast',
    message: 'Fireball used a level 3 slot and rolled its damage. Each click casts it again. Once the level 3 slots run out, the timeline says so.',
    targetSelector: '.canvas-widget[data-tutorial="widget-SPELL_SLOT"]',
    position: 'top',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'events-more-targets',
    title: 'More Targets and Reusable Events',
    message: 'Numeric actions can target All writable values in a widget, with one shared dice roll or a separate roll for each value. Item actions can copy an item from the compendium. Use a card\'s More actions menu to duplicate an event before adapting it to another situation.',
    targetSelector: '[data-tutorial="events-panel"]',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'events-complete',
    title: 'Events Tutorial Complete',
    message: 'You set off events, ran one by hand, followed a chain, built a conditional event from trigger data, and used widget and inline buttons. Keep ongoing bonuses in Effects, calculations in Formulas, and one-time reactive actions in Events.',
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
    message: 'The Community Gallery offers complete Presets, visual Themes and reusable widget Templates. Choose an asset type, then use categories and search to narrow the results. Browse is the community catalog; My Library is your saved collection.',
    targetSelector: '[data-tutorial="gallery-concepts"]',
    position: 'left',
    page: 'character-list',
    requiresManualAdvance: true,
  },
  {
    id: 'various-gallery-manage',
    title: 'Manage My Library',
    message: 'My Library contains your saved presets, themes and templates. Import your own, or use each item menu to share, export or remove an asset. Sharing publishes a copy to the community; it does not synchronize your character during play.',
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
    message: 'Download a backup of your active workspace regularly. It includes its characters and saved assets. Restore loads a backup file; it is different from importing one character. Browser data can be lost if browser storage is cleared.',
    targetSelector: '[data-tutorial="backup-modal"]',
    position: 'right',
    page: 'character-list',
    requiresManualAdvance: true,
  },
  {
    id: 'various-workspaces',
    title: 'Where Your Data Lives',
    message: 'The workspace selector on the character list separates collections stored in this browser, a local folder or Google Drive on supported browsers. External workspaces need access permission. Check the save status before leaving, and keep backups even when using a folder or Drive.',
    targetSelector: '[data-tutorial="backup-modal"]',
    position: 'right', page: 'character-list', dock: 'top', requiresManualAdvance: true,
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
    message: 'Move or resize the print area, choose paper format and orientation, and adjust printer-friendly styling, borders and shadows. The print command opens your browser\'s print dialog, where you can choose a printer or Save as PDF. Choose Next without printing for this tour.',
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
    message: 'List keeps the same widgets in one scrollable column, without changing your canvas arrangement. Switch back to Canvas whenever you want to pan, zoom or arrange widgets freely.',
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
    message: 'Timeline groups activity by day. Search the log, choose its order, show or hide formula changes, and inspect Event actions. Log deletion has its own undo; the sheet\'s Undo reverts changes to the character.',
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
    message: 'Use Add sheet for inventory, spells, notes, companions or anything else you need. Sheets belong to the same character, so labels, formulas, Effects and Events work across them. Try adding a sheet, or choose Next to finish.',
    targetSelector: '[data-tutorial="add-sheet-button"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'various-complete',
    title: 'Various Tutorial Complete',
    message: 'You toured the Community Gallery and My Library, workspace backups and storage, feedback, Print Preview, Canvas and List layouts, timeline and multiple sheets.',
    position: 'center',
    page: 'sheet',
  },
  {
    id: 'compendium-intro',
    title: 'Build and Use a Compendium',
    message: 'Create a reusable Ring of Strength, give it an Effect, and equip a copy to see the bonus. We will also tour organization, copying and transfers. Next opens a temporary practice character; your own character and compendium stay untouched.',
    targetSelector: '[data-tutorial="create-character"]',
    position: 'bottom', page: 'character-list', requiresManualAdvance: true,
  },
  {
    id: 'compendium-load-character',
    title: 'Loading the Practice Character',
    message: 'Preparing Strength 10, an empty Ring equipment slot and an empty compendium.',
    position: 'center', page: 'character-list',
  },
  {
    id: 'compendium-open-panel',
    title: 'Open the Compendium',
    message: 'Click the book button in the toolbar. The compendium belongs to this character and is shared across its sheets.',
    targetSelector: '[data-tutorial="compendium-button"]',
    position: 'bottom', page: 'sheet',
  },
  {
    id: 'compendium-overview',
    title: 'A Reusable Catalog',
    message: 'Define items, spells, abilities or other entries once, then copy them into Codex, Inventory or Equipment widgets. Sections organize the catalog. A stored entry does not apply its Effects by itself.',
    targetSelector: '#compendium-panel',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'compendium-add-section',
    title: 'Create a Section',
    message: 'Type Magic Gear in New section name, then click Add section. You can use your own section name instead.',
    targetSelector: '[data-tutorial="compendium-add-section"]',
    position: 'left', page: 'sheet', dock: 'top',
  },
  {
    id: 'compendium-add-entry',
    title: 'Create an Entry',
    message: 'Click the plus beside your new section to create an entry.',
    targetSelector: '[data-tutorial="compendium-add-entry"]',
    position: 'left', page: 'sheet', dock: 'top',
  },
  {
    id: 'compendium-entry-details',
    title: 'Name Your Item',
    message: 'Enter Ring of Strength. Optionally enable Description and explain what the ring does. Descriptions support rich text, inline formulas and dice. Choose Next after naming it.',
    targetSelector: '[data-tutorial="inventory-item-name"]',
    position: 'left', page: 'sheet', requiresManualAdvance: true,
  },
  {
    id: 'compendium-entry-attributes',
    title: 'Reusable Attributes',
    message: 'Weight is supplied by default; try 0.1. Additional attributes can be text, numbers or checkboxes. Matching attributes fill a widget\'s defaults when copied. Weight can feed encumbrance counters when those are enabled in the destination widget.',
    targetSelector: '[data-tutorial="inventory-item-attributes"]',
    scrollTargetIntoView: true,
    position: 'left', page: 'sheet', requiresManualAdvance: true,
  },
  {
    id: 'compendium-add-effect',
    title: 'Give the Ring an Effect',
    message: 'Click Add effect. This will be a reversible bonus while a copy of the ring is active.',
    targetSelector: '[data-tutorial="item-add-effect"]',
    scrollTargetIntoView: true,
    position: 'left', page: 'sheet',
  },
  {
    id: 'compendium-effect-target',
    title: 'Choose the Target',
    message: 'In Widget choose Stats, then in Value choose Strength. The picker lists numeric values across your character\'s sheets; you do not need to type a label.',
    targetSelector: '[data-tutorial="item-effect-target"]',
    scrollTargetIntoView: true,
    position: 'left', page: 'sheet',
  },
  {
    id: 'compendium-effect-amount',
    title: 'Set the Bonus',
    message: 'Set Bonus / penalty to 2, then choose Next. Negative values are penalties. Effects can adjust formula results; limits still apply unless overridden.',
    targetSelector: '[aria-label="Effect amount"]',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'compendium-save-entry',
    title: 'Save the Ring',
    message: 'Click Add entry to save the ring and its Effect in your compendium.',
    targetSelector: '[data-tutorial="inventory-item-save"]',
    position: 'left', page: 'sheet', dock: 'top',
  },
  {
    id: 'compendium-entry-created',
    title: 'Stored, Not Active',
    message: 'Your ring is now in the catalog. Strength is still 10: catalog entries are definitions, not equipped items. We will put a copy in the Ring slot next.',
    targetSelector: '[data-compendium-entry-row="true"]',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'compendium-browse',
    title: 'Find and Organize Entries',
    message: 'Search names, descriptions, attributes and sections. Try searching for Ring.',
    targetSelector: '[aria-label="Search compendium"]',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'compendium-add-equipment',
    title: 'Add an Item to Equipment',
    message: 'The compendium is closed for now. Click the plus in the empty Ring slot. Picking from a dialog also works on phones, without dragging.',
    targetSelector: '.canvas-widget[data-tutorial="widget-INVENTORY_SLOTS"] button[aria-label="Add item to Ring"]',
    position: 'left', page: 'sheet', dock: 'top',
  },
  {
    id: 'compendium-pick-entry',
    title: 'Pick the Compendium Entry',
    message: 'Choose Ring of Strength from From compendium. Its name, attributes, description and Effects fill this new item.',
    targetSelector: '[data-tutorial="inventory-item-compendium"]',
    position: 'left', page: 'sheet',
  },
  {
    id: 'compendium-save-equipment',
    title: 'Equip the Copy',
    message: 'Click Add item to put the copy in the Ring slot. This practice Equipment has Auto-activate items turned off, so the copy starts inactive. Equipment normally activates new items automatically; you can change that in its editor.',
    targetSelector: '[data-tutorial="inventory-item-save"]',
    position: 'left', page: 'sheet', dock: 'top',
  },
  {
    id: 'compendium-activate-effect',
    title: 'Activate the Ring',
    message: 'Turn on the switch beside the ring\'s name. An item with Effects gets this activation control.',
    targetSelector: '.canvas-widget[data-tutorial="widget-INVENTORY_SLOTS"] [role="switch"]',
    position: 'left', page: 'sheet', dock: 'top',
  },
  {
    id: 'compendium-effect-result',
    title: 'Strength Increased',
    message: 'Strength is now 12: its original 10 plus the ring\'s +2. The bonus follows the item\'s active state rather than permanently changing the base value.',
    targetSelector: '.canvas-widget[data-tutorial="widget-NUMBER_DISPLAY"]',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'compendium-open-effects',
    title: 'Inspect the Automation',
    message: 'Open Automations to inspect the active Effect.',
    targetSelector: '[data-tutorial="automations-button-mobile"], [data-tutorial="automations-button"]',
    position: 'bottom', page: 'sheet',
  },
  {
    id: 'compendium-effects-overview',
    title: 'Source and Target',
    message: 'The Effects tab links the Equipment source to the Strength target. You can reveal either widget and toggle the source here too. For ongoing item bonuses, no Event is required.',
    targetSelector: '#automations-content-effects',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'compendium-deactivate-effect',
    title: 'Remove the Bonus',
    message: 'Turn the ring\'s switch off. The ring stays equipped, but its bonus is removed.',
    targetSelector: '.canvas-widget[data-tutorial="widget-INVENTORY_SLOTS"] [role="switch"]',
    position: 'left', page: 'sheet', dock: 'top',
  },
  {
    id: 'compendium-effect-restored',
    title: 'Back to the Base Value',
    message: 'Strength is back to 10. Reactivating the ring would restore +2 without stacking it twice. Removing an active item also removes its bonus.',
    targetSelector: '.canvas-widget[data-tutorial="widget-NUMBER_DISPLAY"]',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'compendium-return-panel',
    title: 'Return to the Catalog',
    message: 'Open the Compendium again to look at the original entry.',
    targetSelector: '[data-tutorial="compendium-button"]',
    position: 'bottom', page: 'sheet',
  },
  {
    id: 'compendium-copies',
    title: 'Definitions and Copies',
    message: 'The original ring is still here. Copies are independent: changing or deleting the catalog entry does not change an existing equipped copy. The pencil opens an entry for editing, cloning or deletion. Character Undo can reverse compendium changes.',
    targetSelector: '[data-compendium-entry-row="true"]',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'compendium-save-existing',
    title: 'Bring Existing Items Back',
    message: 'Drag catalog entries to Codex, Inventory or Equipment. Drag widget items back, or use Add to compendium in their editor. Section buttons collapse, rename or delete; drag handles move entries and arrow keys reorder them. Equipment slots have configurable capacities.',
    targetSelector: '#compendium-panel',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'compendium-export',
    title: 'Export the Catalog',
    message: 'Click Export, then As Raw Data to preview a portable copy. This tour does not require a download or clipboard permission.',
    targetSelector: '[data-tutorial="compendium-export"]',
    position: 'center', page: 'sheet',
  },
  {
    id: 'compendium-export-overview',
    title: 'Transfer and Share',
    message: 'The export contains sections, entries, attributes and Effects. Copy it or download a file to transfer it to another character. On another character, review any Effect targets that need rebinding. Next closes this preview.',
    targetSelector: '[aria-label="Exported compendium data"]',
    position: 'left', page: 'sheet', requiresManualAdvance: true,
  },
  {
    id: 'compendium-import-overview',
    title: 'Import Safely',
    message: 'Import accepts files or pasted raw data. Add merges same-named sections and skips entries with existing names. Replace removes the current catalog first; it is undoable. A full workspace backup also preserves character compendiums.',
    targetSelector: '#compendium-panel',
    position: 'left', page: 'sheet', dock: 'top', requiresManualAdvance: true,
  },
  {
    id: 'compendium-complete',
    title: 'Compendium Tutorial Complete',
    message: 'You created an entry and its Effect, equipped a copy, watched Strength change and revert, and explored organization and transfers. Finish removes this practice character and its compendium.',
    position: 'center', page: 'sheet',
  },
];

export const getTutorialStepIndex = (id: string) => TUTORIAL_STEPS.findIndex((step) => step.id === id);

export const isTutorialStep = (step: number | null, id: string) => step !== null && TUTORIAL_STEPS[step]?.id === id;

interface TutorialState {
  tutorialStep: number | null;
  startTutorial: () => void;
  startThemesTutorial: () => void;
  startTemplatesTutorial: () => void;
  startAutomationTutorial: () => void;
  startAdvancedAutomationTutorial: () => void;
  startEventsTutorial: () => void;
  startVariousTutorial: () => void;
  startCompendiumTutorial: () => void;
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

  startAdvancedAutomationTutorial: () => {
    const advancedTutorialStart = TUTORIAL_STEPS.findIndex((step) => step.id === ADVANCED_AUTOMATION_TUTORIAL_START_ID);
    const tutorialStep = advancedTutorialStart >= 0 ? advancedTutorialStart : 0;
    set({ tutorialStep });
    localStorage.setItem(TUTORIAL_STORAGE_KEY, String(tutorialStep));
  },

  startEventsTutorial: () => {
    const eventsTutorialStart = TUTORIAL_STEPS.findIndex((step) => step.id === EVENTS_TUTORIAL_START_ID);
    const tutorialStep = eventsTutorialStart >= 0 ? eventsTutorialStart : 0;
    set({ tutorialStep });
    localStorage.setItem(TUTORIAL_STORAGE_KEY, String(tutorialStep));
  },

  startVariousTutorial: () => {
    const variousTutorialStart = TUTORIAL_STEPS.findIndex((step) => step.id === VARIOUS_TUTORIAL_START_ID);
    const tutorialStep = variousTutorialStart >= 0 ? variousTutorialStart : 0;
    set({ tutorialStep });
    localStorage.setItem(TUTORIAL_STORAGE_KEY, String(tutorialStep));
  },

  startCompendiumTutorial: () => {
    const tutorialStep = getTutorialStepIndex(COMPENDIUM_TUTORIAL_START_ID);
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
