import { useEffect, useRef, useState } from 'react';
import packageInfo from '../../package.json';
import { useStore } from '../store/useStore';
import { ChevronDownIcon, ChevronUpIcon, XIcon } from './icons';

const LAST_SEEN_VERSION_STORAGE_KEY = 'ucs:lastSeenVersion';

// Brand-new users (nothing stored) are not shown a changelog, except existing users upgrading to 1.10.0.
function shouldShowChangelogOnLoad(hasCharacters: boolean): boolean {
  try {
    const lastSeen = localStorage.getItem(LAST_SEEN_VERSION_STORAGE_KEY);
    if (lastSeen === null) return packageInfo.version === '1.10.0' && hasCharacters;
    return lastSeen !== packageInfo.version;
  } catch {
    return false;
  }
}

// Decides once, after the workspace is ready, whether to auto-open the changelog for a new version.
export function useChangelogOnLoad(ready: boolean): [boolean, () => void] {
  const [show, setShow] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!ready || checkedRef.current) return;
    checkedRef.current = true;
    setShow(shouldShowChangelogOnLoad(useStore.getState().characters.length > 0));
    try {
      localStorage.setItem(LAST_SEEN_VERSION_STORAGE_KEY, packageInfo.version);
    } catch {
      // Storage unavailable; the version is simply not remembered.
    }
  }, [ready]);

  return [show, () => setShow(false)];
}

const CHANGELOG_ENTRIES = [
  {
    version: '1.10.1',
    changes: [
      'New "Hide attached edges" setting in the main menu: removes the visible line between attached widgets.',
    ],
  },
  {
    version: '1.10.0',
    changes: [
      'Build mode is gone: arrange widgets directly on the sheet. On desktop, drag the grip on a widget\'s top edge to move it, drag its edges to resize it, and right-click or select it for its menu and attach buttons. On touch devices, long-press a widget to pick it up and drag it, or long-press and release to select it and open its menu.',
      'Right-click an empty spot on the sheet to pick a widget type from a menu and add it at that position.',
      'Resizing a widget no longer detaches all of its sides. Only the edges that moved are detached.',
      'Numbers in the Number Display widget look better when they have secondary numbers.',
      'Added 2 themes to the community themes.',
      'Added a preset for Umerica.',
    ],
  },
  {
    version: '1.9.0',
    changes: [
      'New Wallet widget: track coins with custom currencies and exchange rates (cp, sp, gp by default), add or spend money with automatic change, convert between currencies, and show the total in the currency of your choice. Transactions are recorded in the timeline.',
      'The formula editor now highlights exactly what is broken in a formula (unknown labels, unclosed parentheses, missing values, wrong function arguments, and more) and lists what is wrong.',
      'Mixed Fields widgets now have an alignment setting (left, center or right) in the editor that applies to all of their fields.',
      'Inventory items now show the name on its own line with the attributes below it, using the full width of the item card.',
      'Inventory items can now have an optional description with the same formatting as the notes widget (except font size). It is collapsed by default on the item card.',
      'The value dialogs of Progress Bar, Number Tracker, Number Display and Mixed Fields now have an "Add or Remove amount" button to add or subtract an amount from the current value.',
    ],
  },
  {
    version: '1.8.1',
    changes: [
      'Added columns to the widgets: Fields and Stats, Mixed Fields, Number Tracker, Resources Pool, List, Step Dice and Checklist.',
      'Few optimizations to improve performance on big sheets',
      'You can now drag and drop a character JSON file onto the character list to import it.',
      'Fixed table cells whose text starts with a number (like 1d8) being read as only that number in formulas, with values refreshing when a character is opened.',
      'Fixed the broken-formula warning appearing on table cells that return text.',
    ],
  },
  {
    version: '1.8.0',
    changes: [
      'Formulas can now output strings.',
      'Most strings can now use the {formula} syntax to change dynamically. Example: set the label @class to your class name, then use {@class} almost anywhere to show the class name.',
      'Fixed dragging to select text in an input or text box also panning the camera.',
      'Dice expressions now support common syntax to keep/drop highest/lowest (2d20kh to keep the highest of 2 d20s. You can also write 4d12dl2 to indicate roll 4d12 then drop the lowest 2).',
      'In Build mode, sheets can now be re-ordered by dragging them in the sheet dropdown menu.',
    ],
  },
  {
    version: '1.7.0',
    changes: [
      'Added new ways to make small, targeted edits to widgets without entering Build mode or opening the full widget editor.',
      'Inventory items can now have negative weight.',
      'Added the ability to overwrite initiative roll results in the initiative tracker.',
      'Moving the camera with a mouse is easier: camera panning can start over clickable elements.',
    ],
  },
  {
    version: '1.6.3',
    changes: [
      'Added new option to better control the layout of the number display widget',
    ],
  },
  {
    version: '1.6.2',
    changes: [
      'You can now select multiple cells from a table with Shift-click, or by clicking cells while the Edit Table button is active.',
      'Formatting applies to every selected cell.',
      'You can merge multiple cells together.',
      'Added an option to align the checkboxes in the checklist widget to the top of a multiline item.',
      'Added an option to automatically expand roll details in the dice roller and dice tray.',
      'Added more options to customize the header of each widget.',
    ],
  },
  {
    version: '1.6.1',
    changes: [
      'Revamped the roll table widget.',
      'Added the Pokemon TTRPG community preset.',
      'Added a quick add button for the spell slots widget',
      'Menus in mixed field widget can now be labeled and used in formulas (ex : if(@menu = "druid", 0, 1))',
    ],
  },
  {
    version: '1.6.0',
    changes: [
      'Added the Progress Clock widget.',
      'Added item quantities to the inventory widget, including the ability to split a stack into two stacks.',
      'Inventory item attributes can now be labeled for use in formulas.',
      'Added the Daggerheart preset to the community contributions.',
      'Added the ability to delete all timeline events from a given day.',
      'Added a slider to control the height of participants in the initiative tracker.',
      'Updated the Steampunk, High Magic, Necrotic, and Sci-Fi built-in themes.',
      'Fixed an issue that made progress bar widgets impossible to drag and move when the label was inline.',
      'Fixed an issue with the positioning of some widgets not perfectly aligning as they should.',
    ],
  },
  {
    version: '1.5.0',
    changes: [
      'Added workspaces. A workspace is like a directory where you store all your UCS data.',
      {
        text: 'There are three types of workspaces:',
        items: [
          'Browser: The default option. All data is stored in the browser cache. It is the easiest to set up, but your data may be lost if you clear the cache, and it is limited to that browser and device.',
          'Local workspace: Select a directory on your computer where your data is stored for a safer option that is still simple to use.',
          'Google Drive: Link your Google Drive and create a workspace there to access your characters from any device. Your data synchronizes automatically.',
        ],
      },
      'Greatly improved character sheet performance, especially when panning and zooming on older devices.',
      'Numbers in number tracker, number display and mixed fields widgets can be displayed with their + sign if they are positive (+5 instead of 5)',
      'Added temporary HP to the health bar widget',
    ],
  },
  {
    version: '1.4.4',
    changes: [
      'New formula editor',
      'You can now directly edit the min and max values of numbers in the Number Tracker, Number Display, and Mixed Fields widgets.',
      'Added D&D 5.5e preset in the community contributions',
    ],
  },
  {
    version: '1.4.3',
    changes: [
      'Fixed a few issues with the list view (multiple columns now fill the screen better, widgets can now be dropped in any position as expected, and some widgets were not properly displayed).',
      'Adjusted style consistency of many elements (mostly buttons and the inventory widget).',
      'You can keep interacting with your character sheet while the add widget panel is opened.',
      'You can drag and drop widgets directly into the character sheet.',
      'Added the attribute "Amount" to cards in the deck of cards widget to have several copies of the same card.',
    ],
  },
  {
    version: '1.4.2',
    changes: [
      'Fixed a few rendering and theme consistency issues.',
      'Added a few customization options, including rounded corners for tables, dice size in the dice tray, and size of number containers in the number display.',
      'Preview in editor windows now stays visible at all times on desktop.',
      'Sections in the editors are now collapsible.',
    ],
  },
  {
    version: '1.4.1',
    changes: [
      'Added options to hide the name and/or the edit button for the image widget',
      'Items in the inventory widget now better match themes.',
    ],
  },
  {
    version: '1.4.0',
    changes: [
      'Reworked all widget editors to be visually more consistent.',
      'Previews are now shown on the right side on desktop.',
      {
        text: 'Added several options throughout the app, including:',
        items: [
          'Vertical spacing sliders for Fields & Stats, Mixed Fields, and related widgets.',
          'Additional customization options for the Spell Slots widget.',
          'Several other small options and improvements.',
        ],
      },
      'Notes widget: Removed the toolbar at the top and replaced it with a contextual toolbar that appears only while typing.',
      'Dice roller and dice tray: Detailed results now appear in an overlay box so they no longer overflow the widget.',
      'Fixed multiple number inputs that prevented users from completely erasing the number before entering a new one.',
      'Fixed an issue with the new 3D cards causing a white screen of death.',
    ],
  },
  {
    version: '1.3.1',
    changes: [
      'Fixed an issue on touch devices where some buttons would never disappear.',
    ],
  },
  {
    version: '1.3.0',
    changes: [
      'Most widgets that contain text now support formulas. Write your formula in curly brackets; for example, {10 + @str} renders as 10 plus the value labeled @str.',
      'Added multiple customization options for the image widget.',
      'Fixed an issue causing the attachment buttons not to be displayed in build mode.',
    ],
  },
  {
    version: '1.2.0',
    changes: [
      'Exported characters now include their custom theme.',
      'Importing a character with a custom theme that is not in the library lets users choose whether to import and apply the custom theme as well.',
      'If they do not, the default theme now reflects whether the app is using the dark or light theme.',
      {
        text: 'Made several improvements to the theme selection panel:',
        items: [
          'Export and import as JSON',
          'Community themes are directly selectable from the theme panel',
          'Many small tweaks',
        ],
      },
    ],
  },
  {
    version: '1.1.1',
    changes: [
      'Fixed several issues related to the z-ordering of widgets (the logic that determines which widget is rendered on top of the others).',
      'Fixed several menus that were not using the correct corner radius.',
      'Added this changelog button',
    ],
  },
  {
    version: '1.1.0',
    changes: [
      'New Deck of Cards widget. Renders 3D cards with fancy animations.',
      'The old deck of cards widget was renamed "Legacy Deck of Cards".',
      'Option to remove the + and - buttons from the number tracker widget',
      {
        text: 'New community contributions:',
        items: [
          '[Preset] OVA: The Anime RPG by Nyest',
          '[Theme] OVA by Nyest',
          '[Theme] Icebreaker by Holypunk',
          '[Theme] Holypunk by Holypunk',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    changes: [
      'Added logo',
      'The app is now a PWA app that you can install on your device',
      'The camera view is stored for each character sheet. If you set up your view in canvas mode with a precise zoom level and switch characters or sheets, then return, it will be restored exactly as it was.',
      'Pop-up windows should no longer be hidden behind the virtual keyboard on touch devices (hopefully? Touch is annoying).',
      'Added optional secondary numbers to the number display widget. You can type in any number manually, or select automatic calculations of modifiers (example, an intelligence of 15 yields a +3 mod). These mods support labeling, so you can use them in formulas.',
      {
        text: 'You can now add dice roll buttons directly in the text of some widgets. For example, type "strength test {d20+@str}" and in play mode, it will render as a dice button you can click. Supported widgets:',
        items: ['List', 'Notes', 'Fields & Stats', 'Mixed Fields', 'Inventory', 'Table'],
      },
      'Fixed a few bugs with the initiative tracker',
    ],
  },
] as const;

export default function ChangelogDialog({ darkMode, onClose }: { darkMode: boolean; onClose: () => void }) {
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>(() => ({
    [CHANGELOG_ENTRIES[0].version]: true,
  }));

  return (
    <>
      <div
        data-touch-camera-ignore="true"
        className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-title"
        className={`fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-1.5rem)] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-theme p-5 shadow-theme animate-fade-in sm:p-6 ${
          darkMode
            ? 'border border-white/30 bg-black text-white'
            : 'border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="changelog-title" className="font-heading text-xl font-bold">Changelog</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close changelog"
            className={darkMode ? 'text-white/60 transition-colors hover:text-white' : 'text-theme-muted transition-colors hover:text-theme-ink'}
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {CHANGELOG_ENTRIES.map((entry) => {
            const isExpanded = expandedVersions[entry.version] ?? false;
            const contentId = `changelog-version-${entry.version.replace(/\./g, '-')}`;

            return (
              <section key={entry.version}>
                <button
                  type="button"
                  onClick={() => setExpandedVersions((expanded) => ({
                    ...expanded,
                    [entry.version]: !isExpanded,
                  }))}
                  aria-expanded={isExpanded}
                  aria-controls={contentId}
                  className={`group flex w-full items-center justify-between border-b-[length:var(--border-width)] pb-2 text-left font-heading text-base font-bold ${
                    darkMode ? 'border-white/30 text-white' : 'border-theme-border text-theme-ink'
                  }`}
                >
                  <span>{entry.version}</span>
                  {isExpanded ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </button>
                {isExpanded && (
                  <ul id={contentId} className={`mt-2 list-disc space-y-2 pl-5 font-body text-sm leading-relaxed ${darkMode ? 'text-white/75' : 'text-theme-muted'}`}>
                    {entry.changes.map((change, index) => (
                      typeof change === 'string' ? (
                        <li key={`${entry.version}-${index}`}>{change}</li>
                      ) : (
                        <li key={`${entry.version}-${index}`}>
                          {change.text}
                          <ul className="mt-2 list-disc space-y-1 pl-5">
                            {change.items.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </li>
                      )
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
