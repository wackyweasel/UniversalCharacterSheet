import { create } from 'zustand';

const TUTORIAL_STORAGE_KEY = 'ucs:tutorialStep';

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
    message: 'You can also choose a preset to start with pre-made widgets, or pick a theme for different visual styles. For now, let\'s keep the defaults and click Create!',
    targetSelector: '[data-tutorial="create-button"]',
    position: 'top',
    page: 'character-list',
  },
  {
    id: 'welcome-sheet',
    title: 'Welcome to Your Character Sheet!',
    message: 'This is where you\'ll build your character sheet. It\'s empty right now, so let\'s add some widgets! First, switch to Edit Mode.',
    targetSelector: '[data-tutorial="edit-mode-button"]',
    position: 'bottom',
    page: 'sheet',
  },
  {
    id: 'add-widget',
    title: 'Add Your First Widget',
    message: 'Click "Add Widget" to open the widget toolbox. You\'ll find different types of widgets to build your character sheet!',
    targetSelector: '[data-tutorial="add-widget-button"]',
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
    title: 'Close the Toolbox',
    message: 'Great job! You\'ve added some widgets. Now close the toolbox by clicking the X button to see your character sheet.',
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
    title: 'Switch to Play Mode',
    message: 'This sheet has lots of widgets! Now switch to Play Mode to interact with them like you would during a game session.',
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
];

interface TutorialState {
  tutorialStep: number | null;
  startTutorial: () => void;
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
