import { create } from 'zustand';

const TUTORIAL_STORAGE_KEY = 'ucs:tutorialStep';

export const THEME_TUTORIAL_START_ID = 'themes-open-panel';
export const TEMPLATE_TUTORIAL_START_ID = 'templates-open-widget-menu';
export const AUTOMATION_TUTORIAL_START_ID = 'automation-intro';
export const ADVANCED_AUTOMATION_TUTORIAL_START_ID = 'advanced-intro';
export const EVENTS_TUTORIAL_START_ID = 'events-intro';
export const VARIOUS_TUTORIAL_START_ID = 'various-open-gallery';

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
    scrollTargetIntoView: true,
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
    scrollTargetIntoView: true,
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
    title: 'Formula Reference',
    message: 'The formula editor includes every available label and an organized reference for operators, conditions, math functions, and table commands. Select any reference item to see how it works and review practical examples. If a formula is broken, the editor highlights what is wrong.',
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
    message: 'Click the Strength value and change it, or use "Add or Remove amount" to add or subtract from it. When you confirm the new number, the dice roller modifier updates because it is reading @str.',
    targetSelector: '[data-tutorial="automation-strength-value"]',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'automation-inline-formulas',
    title: 'Formulas Inside Text',
    message: 'You can also use formulas inside text. Wrap one in curly braces, like {@str+10}, in a widget title, a field name, a tooltip, or most other text, and it shows the calculated result. With Strength at 14, {@str+10} displays 24.',
    position: 'center',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'automation-complete',
    title: 'Automation Tutorial Complete',
    message: 'That is the automation loop: tag a source value, use @tag in another widget formula or in {text}, then let the sheet keep the connected values in sync.',
    position: 'center',
    page: 'sheet',
  },
  {
    id: ADVANCED_AUTOMATION_TUTORIAL_START_ID,
    title: 'Advanced Automations',
    message: 'This tour goes deeper than the Automation tutorial. You will explore the formula editor and its commands, then use formulas and dice expressions in a dice roller and inside text, and finish with the Labels panel. It helps to finish the Automation tutorial first.',
    position: 'center',
    page: 'character-list',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-load-character',
    title: 'Load the Tutorial Character',
    message: 'Loading a tutorial character where Strength is already tagged @str.',
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
    message: 'Every tagged value on your character is listed here, such as @str. Click one to insert it into the formula. Tags are how a formula reads values from other widgets.',
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
    id: 'advanced-formula-text',
    title: 'Text',
    message: 'Formulas can also build text: "Level " + @level joins words and numbers. Text results belong in text fields and in {formula} text, so a number field like this one would not accept them.',
    targetSelector: '[data-tutorial="formula-reference"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-formula-tables',
    title: 'Tables',
    message: 'THRESHOLD, VALUE and SUM read whole columns of a Table widget. For example, SUM(@qty * @weight) multiplies each row and adds the rows up. They are handy for XP levels and inventory weight.',
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
    id: 'advanced-use-dice-expression',
    title: 'Dice Expressions',
    message: 'Dice can be written as text too. Check Use dice expression to replace the fixed dice with an expression.',
    targetSelector: '[data-tutorial="advanced-use-dice-expression"]',
    scrollTargetIntoView: true,
    position: 'top',
    page: 'sheet',
  },
  {
    id: 'advanced-dice-expression-basics',
    title: 'Write the Roll',
    message: 'We filled in 2d20kh: roll two d20 and keep the highest. The modifier you just built is added on top. Dice can be added or subtracted, and labels work directly, like 2d20kh + @str. kh and kl keep the highest or lowest, dh and dl drop them, so 4d6dl drops the lowest of four d6.',
    targetSelector: '[data-tutorial="advanced-dice-expression"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-dice-expression-labels',
    title: 'Formulas in Dice',
    message: 'Counts and sizes can come from your sheet. {@level}d6 rolls one d6 per level, and 2d@die uses a die size tagged as @die. Try one in the box if you like.',
    targetSelector: '[data-tutorial="advanced-dice-expression"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
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
    id: 'advanced-roll-dice',
    title: 'Roll the Expression',
    message: 'Roll the Attack dice. The result opens with every die shown. Click dice to select them and reroll only those.',
    targetSelector: '[data-tutorial="automation-roll-dice"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'advanced-inline-notes',
    title: 'Formulas in Text',
    message: 'Formulas inside curly braces also work in text. These notes contain {@str+10}, shown as 20, and it updates whenever Strength changes. This works in widget titles, field names, tooltips and most other text.',
    targetSelector: '.canvas-widget[data-tutorial="widget-TEXT"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-inline-dice-roll',
    title: 'Dice in Text',
    message: 'Dice in curly braces become roll buttons, like {1d20+@str} or {2d6+@str}. Click one of the dice icons in the notes to roll it.',
    targetSelector: '.canvas-widget[data-tutorial="widget-TEXT"] .inline-dice-token',
    position: 'left',
    page: 'sheet',
  },
  {
    id: 'advanced-inline-dice-result',
    title: 'The Roll Result',
    message: 'The result opens over the widget. Everything from the dice editor works here too, such as {2d20kh+@str}. To show braces without rolling or calculating, double them: {{like this}}.',
    targetSelector: '.dice-result-dialog',
    position: 'bottom',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-open-labels',
    title: 'Open Labels',
    message: 'As your sheet grows, so does the number of labels. Open the Labels panel to see them all in one place.',
    targetSelector: '[data-tutorial="labels-button"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'advanced-labels-overview',
    title: 'The Labels Panel',
    message: 'Every label on this character is listed here, grouped by widget. Search them, or click a label to change its value, rename it or delete it. When you rename a label, you can update every formula that uses it.',
    targetSelector: '[data-tutorial="labels-panel"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-labels-standalone',
    title: 'Standalone Labels',
    message: 'Standalone labels are not tied to any widget, such as a proficiency bonus. Create them with Create new label, group them into sections, drag them between sections, and use them in any formula like any other @label.',
    targetSelector: '[data-tutorial="labels-standalone"]',
    position: 'left',
    page: 'sheet',
    requiresManualAdvance: true,
  },
  {
    id: 'advanced-complete',
    title: 'Advanced Automations Complete',
    message: 'You have seen the formula editor and its commands, dice expressions with keep, drop and labels, formulas and dice inside text, and the Labels panel. Combine them to automate your own sheet.',
    position: 'center',
    page: 'sheet',
  },
  {
    id: EVENTS_TUTORIAL_START_ID,
    title: 'Events',
    message: 'Events make your sheet react on its own: when something happens, they do something for you. You will set off ready-made events, run one by hand, follow a chain in the timeline, then build an event that uses the result of a roll.',
    position: 'center',
    page: 'character-list',
    requiresManualAdvance: true,
  },
  {
    id: 'events-load-character',
    title: 'Load the Tutorial Character',
    message: 'Loading a tutorial character that already has three events.',
    position: 'center',
    page: 'character-list',
  },
  {
    id: 'events-open-panel',
    title: 'Open the Events Panel',
    message: 'Open Events from the toolbar. Every event on this character lives there.',
    targetSelector: '[data-tutorial="events-button-mobile"], [data-tutorial="events-button"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'events-panel-overview',
    title: 'The Events Panel',
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
    message: 'Frightened is on now. The timeline logs Bloodied with each of its effects, and its message shows the HP it passed along. Click an event name to find it in the Events panel. Undo reverts the damage and everything the event did, together.',
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
    message: 'A trigger passes along what happened. This one passes the roll as @event_total, @event_highest and @event_lowest. Use them in the condition or an effect like any other label. Click a chip to add it where you were typing.',
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
    title: 'Then: the Effects',
    message: 'Effects run in order. We added two: roll the Damage dice, then write "Hit with a {@event_total}!" in the timeline. In text, braces show the value of a formula. Add as many effects as you need, and reorder them with the arrows.',
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
    id: 'events-complete',
    title: 'Events Tutorial Complete',
    message: 'You set off events, ran one by hand, followed a chain in the timeline, and built an event that uses its trigger\'s data in a condition and an effect. Every widget offers its own triggers and effects, so explore the editor to automate your own sheet.',
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
    message: 'Download backups regularly. Depending on your workspace, your data lives in this browser, a folder on your computer, or Google Drive. This is where you can restore from a backup file if you change devices or lose your data.',
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
    message: 'Use Add sheet when you want another page for inventory, spells, notes, companions, vehicles, or anything else your character needs.',
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
