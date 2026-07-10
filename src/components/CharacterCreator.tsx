import type { FormEvent } from 'react';
import { PRESET_DEFINITIONS, type CharacterPreset, type PresetDefinition } from '../presets';
import { THEMES } from '../store/useThemeStore';
import type { CustomTheme } from '../store/useCustomThemeStore';
import type { UserPreset } from '../store/useUserPresetStore';

interface CharacterCreatorProps {
  darkMode: boolean;
  firstCharacter?: boolean;
  name: string;
  selectedPreset: string;
  selectedTheme: string;
  customThemes: CustomTheme[];
  userPresets: UserPreset[];
  startingPointLocked?: boolean;
  nameHighlighted?: boolean;
  createHighlighted?: boolean;
  onNameChange: (name: string) => void;
  onChooseBlank: () => void;
  onChooseBuiltIn: (preset: PresetDefinition) => void;
  onChooseUser: (preset: UserPreset) => void;
  onThemeChange: (themeId: string) => void;
  onCreate: () => void;
  onCancel?: () => void;
  onImport: () => void;
  onTour: () => void;
  onDiscover: () => void;
}

function getPresetStats(preset: CharacterPreset) {
  return {
    sheetCount: preset.sheets.length,
    widgetCount: preset.sheets.reduce((total, sheet) => total + sheet.widgets.length, 0),
  };
}

interface StartingPointProps {
  name: string;
  meta: string;
  accent: string;
  selected: boolean;
  disabled?: boolean;
  darkMode: boolean;
  onClick: () => void;
}

function StartingPoint({ name, meta, accent, selected, disabled = false, darkMode, onClick }: StartingPointProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={`relative min-h-[72px] p-3 pl-4 rounded-button border text-left flex items-center gap-3 transition-colors overflow-hidden ${
        selected
          ? darkMode
            ? 'bg-white/10 border-white text-white'
            : 'bg-blue-50 border-blue-700 text-gray-950'
          : darkMode
            ? 'bg-white/[0.03] border-white/20 text-white hover:bg-white/[0.07] hover:border-white/45'
            : 'bg-white border-gray-300 text-gray-950 hover:border-gray-500 hover:bg-gray-50'
      } ${disabled ? 'opacity-35 cursor-not-allowed' : ''}`}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} aria-hidden="true" />
      <span
        className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center text-[11px] font-bold ${
          selected
            ? darkMode
              ? 'bg-white border-white text-black'
              : 'bg-blue-700 border-blue-700 text-white'
            : darkMode
              ? 'border-white/35 text-transparent'
              : 'border-gray-400 text-transparent'
        }`}
        aria-hidden="true"
      >
        ✓
      </span>
      <span className="min-w-0">
        <span className="block font-heading font-bold text-sm leading-tight">{name}</span>
        <span className={`block font-body text-[11px] mt-1 ${darkMode ? 'text-white/45' : 'text-gray-500'}`}>{meta}</span>
      </span>
    </button>
  );
}

export default function CharacterCreator({
  darkMode,
  firstCharacter = false,
  name,
  selectedPreset,
  selectedTheme,
  customThemes,
  userPresets,
  startingPointLocked = false,
  nameHighlighted = false,
  createHighlighted = false,
  onNameChange,
  onChooseBlank,
  onChooseBuiltIn,
  onChooseUser,
  onThemeChange,
  onCreate,
  onCancel,
  onImport,
  onTour,
  onDiscover,
}: CharacterCreatorProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onCreate();
  };

  return (
    <section
      aria-labelledby="character-creator-title"
      className={`${onCancel ? 'p-5 sm:p-7' : `p-5 sm:p-7 rounded-theme shadow-theme border ${darkMode ? 'bg-black border-white/25' : 'bg-white border-gray-300'}`}`}
    >
      <form onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`font-body text-xs font-bold uppercase tracking-[0.18em] ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              New character
            </p>
            <h2 id="character-creator-title" className={`font-heading text-2xl sm:text-3xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-950'}`}>
              {firstCharacter ? 'Create your first character' : 'Create a character'}
            </h2>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close character creator"
              className={`w-9 h-9 shrink-0 rounded-button flex items-center justify-center text-xl transition-colors ${darkMode ? 'text-white/65 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              ×
            </button>
          )}
        </div>

        <div className="mt-6" data-tutorial="character-name-input">
          <label htmlFor="new-character-name" className={`block font-body text-sm font-semibold mb-1.5 ${darkMode ? 'text-white/70' : 'text-gray-700'}`}>
            Character name
          </label>
          <input
            id="new-character-name"
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="New Character"
            autoFocus
            className={`w-full h-12 px-4 text-base rounded-button border font-body focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              darkMode
                ? 'bg-black text-white border-white/30 placeholder-white/35 focus:ring-offset-black'
                : 'bg-white text-gray-950 border-gray-400 placeholder-gray-400 focus:ring-offset-white'
            } ${nameHighlighted ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}
          />
        </div>

        <fieldset className="mt-6">
          <legend className="sr-only">Starting point</legend>
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <span className={`font-heading font-bold ${darkMode ? 'text-white' : 'text-gray-950'}`}>Starting point</span>
            <p className={`font-body text-xs ${darkMode ? 'text-white/45' : 'text-gray-500'}`}>
              Blank opens in Build. Presets open ready to play.
            </p>
          </div>

          <select
            aria-label="Starting point"
            value={selectedPreset}
            disabled={startingPointLocked}
            onChange={(event) => {
              const value = event.target.value;
              if (value === '') {
                onChooseBlank();
                return;
              }
              if (value.startsWith('user:')) {
                const preset = userPresets.find((item) => `user:${item.id}` === value);
                if (preset) onChooseUser(preset);
                return;
              }
              const definition = PRESET_DEFINITIONS.find((item) => item.name === value);
              if (definition) onChooseBuiltIn(definition);
            }}
            className={`sm:hidden w-full h-12 px-3 mt-3 rounded-button border font-body text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              darkMode ? 'bg-black text-white border-white/30' : 'bg-white text-gray-950 border-gray-400'
            } ${startingPointLocked ? 'opacity-50' : ''}`}
          >
            <option value="">Blank sheet</option>
            <optgroup label="Built-in Presets">
              {PRESET_DEFINITIONS.map((definition) => (
                <option key={definition.id} value={definition.name}>{definition.name}</option>
              ))}
            </optgroup>
            {userPresets.length > 0 && (
              <optgroup label="My Presets">
                {userPresets.map((preset) => (
                  <option key={preset.id} value={`user:${preset.id}`}>{preset.name}</option>
                ))}
              </optgroup>
            )}
          </select>

          <div role="radiogroup" aria-label="Starting point" className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
            <StartingPoint
              name="Blank sheet"
              meta="Start from scratch"
              accent="#2563eb"
              selected={selectedPreset === ''}
              darkMode={darkMode}
              onClick={onChooseBlank}
            />
            {PRESET_DEFINITIONS.map((definition) => {
              const stats = getPresetStats(definition.preset);
              return (
                <StartingPoint
                  key={definition.id}
                  name={definition.name}
                  meta={`${stats.widgetCount} widgets · ${stats.sheetCount} sheet${stats.sheetCount === 1 ? '' : 's'}`}
                  accent={definition.accent}
                  selected={selectedPreset === definition.name}
                  disabled={startingPointLocked}
                  darkMode={darkMode}
                  onClick={() => onChooseBuiltIn(definition)}
                />
              );
            })}
          </div>

          {userPresets.length > 0 && (
            <div className="hidden sm:block mt-5">
              <p className={`font-body text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-white/45' : 'text-gray-500'}`}>My presets</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                {userPresets.map((preset) => {
                  const stats = getPresetStats(preset.preset);
                  return (
                    <StartingPoint
                      key={preset.id}
                      name={preset.name}
                      meta={`${stats.widgetCount} widgets · ${stats.sheetCount} sheet${stats.sheetCount === 1 ? '' : 's'}`}
                      accent="#7c3aed"
                      selected={selectedPreset === `user:${preset.id}`}
                      disabled={startingPointLocked}
                      darkMode={darkMode}
                      onClick={() => onChooseUser(preset)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {startingPointLocked && (
            <p className={`font-body text-xs mt-2 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>The Quick Tour starts with a blank sheet.</p>
          )}
        </fieldset>

        <div className={`mt-6 pt-5 border-t ${darkMode ? 'border-white/15' : 'border-gray-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="sm:w-64">
              <label htmlFor="new-character-theme" className={`block font-body text-xs font-semibold mb-1.5 ${darkMode ? 'text-white/55' : 'text-gray-600'}`}>Theme</label>
              <select
                id="new-character-theme"
                value={selectedTheme}
                onChange={(event) => onThemeChange(event.target.value)}
                className={`w-full h-11 px-3 rounded-button border font-body text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-black text-white border-white/30' : 'bg-white text-gray-950 border-gray-400'
                }`}
              >
                <optgroup label="Built-in Themes">
                  {THEMES.map((theme) => (
                    <option key={theme.id} value={theme.id}>{theme.icon} {theme.name}</option>
                  ))}
                </optgroup>
                {customThemes.length > 0 && (
                  <optgroup label="Custom Themes">
                    {customThemes.map((theme) => (
                      <option key={theme.id} value={theme.id}>🎨 {theme.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="flex-1 sm:flex sm:justify-end gap-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className={`w-full sm:w-auto h-11 px-4 rounded-button border font-body text-sm font-semibold transition-colors ${
                    darkMode ? 'border-white/25 text-white/70 hover:bg-white/10' : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                data-tutorial="create-button"
                className={`w-full sm:w-auto h-11 px-6 rounded-button font-heading font-bold transition-colors ${
                  darkMode ? 'bg-white text-black hover:bg-white/85' : 'bg-blue-700 text-white hover:bg-blue-800'
                } ${createHighlighted ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}
              >
                Create character
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5">
            <button type="button" onClick={onImport} className={`font-body text-xs font-semibold underline-offset-4 hover:underline ${darkMode ? 'text-white/60' : 'text-gray-600'}`}>Import instead</button>
            <button type="button" onClick={onTour} className={`font-body text-xs font-semibold underline-offset-4 hover:underline ${darkMode ? 'text-white/60' : 'text-gray-600'}`}>Take the Quick Tour</button>
            <button type="button" onClick={onDiscover} className={`font-body text-xs font-semibold underline-offset-4 hover:underline ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Discover community presets</button>
          </div>
        </div>
      </form>
    </section>
  );
}
