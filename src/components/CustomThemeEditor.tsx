import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  CustomTheme, 
  FONT_OPTIONS, 
  ICON_OPTIONS, 
  createDefaultCustomTheme,
} from '../store/useCustomThemeStore';
import {
  TEXTURE_OPTIONS,
  SHADOW_STYLE_OPTIONS,
  BORDER_STYLE_OPTIONS,
  getTextureCSS,
  getShadowStyleCSS,
  isImageTexture,
  IMAGE_TEXTURES,
} from '../store/useThemeStore';
import { CheckIcon, TrashIcon, XIcon } from './icons';

interface CustomThemeEditorProps {
  theme?: CustomTheme; // If provided, we're editing; otherwise creating new
  onSave: (theme: CustomTheme) => void;
  onCancel: () => void;
  onDelete?: () => void; // Only for editing existing themes
}

// Color key type for highlighting
type ColorKey = 'background' | 'paper' | 'ink' | 'accent' | 'accentHover' | 'border' | 'shadow' | 'muted' | 'glow';

export default function CustomThemeEditor({ theme, onSave, onCancel, onDelete }: CustomThemeEditorProps) {
  const isEditing = !!(theme?.id && theme.id.length > 0);
  const defaultTheme = createDefaultCustomTheme();
  
  const [name, setName] = useState(theme?.name || defaultTheme.name);
  const [icon, setIcon] = useState(theme?.icon || defaultTheme.icon);
  const [description, setDescription] = useState(theme?.description || defaultTheme.description);
  const [colors, setColors] = useState(theme?.colors || defaultTheme.colors);
  const [headingFont, setHeadingFont] = useState(theme?.fonts.heading || defaultTheme.fonts.heading);
  const [bodyFont, setBodyFont] = useState(theme?.fonts.body || defaultTheme.fonts.body);
  const [borderRadius, setBorderRadius] = useState(theme?.borderRadius || defaultTheme.borderRadius);
  const [buttonRadius, setButtonRadius] = useState(theme?.buttonRadius || defaultTheme.buttonRadius);
  const [borderWidth, setBorderWidth] = useState(theme?.borderWidth || defaultTheme.borderWidth);
  const [shadowStyle, setShadowStyle] = useState(theme?.shadowStyle || defaultTheme.shadowStyle);
  const [cardTexture, setCardTexture] = useState(theme?.cardTexture || defaultTheme.cardTexture);
  const textureColor = '#ffffff'; // Fixed white texture color
  const [textureOpacity, setTextureOpacity] = useState(theme?.textureOpacity ?? defaultTheme.textureOpacity);
  const [borderStyle, setBorderStyle] = useState(theme?.borderStyle || defaultTheme.borderStyle);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [hoveredColor, setHoveredColor] = useState<ColorKey | null>(null);

  const handleColorChange = (key: keyof typeof colors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const newTheme: CustomTheme = {
      id: (theme?.id && theme.id.length > 0) ? theme.id : `custom-${uuidv4()}`,
      name,
      icon,
      description,
      colors,
      fonts: {
        heading: headingFont,
        body: bodyFont,
      },
      borderRadius,
      buttonRadius,
      borderWidth,
      shadowStyle,
      cardTexture,
      textureColor: '#ffffff',
      textureOpacity,
      borderStyle,
    };
    onSave(newTheme);
  };

  const colorFields: { key: keyof typeof colors; label: string }[] = [
    { key: 'background', label: 'Background' },
    { key: 'paper', label: 'Paper/Card' },
    { key: 'ink', label: 'Text/Ink' },
    { key: 'accent', label: 'Accent' },
    { key: 'accentHover', label: 'Accent Hover' },
    { key: 'border', label: 'Border' },
    { key: 'shadow', label: 'Shadow' },
    { key: 'muted', label: 'Muted Text' },
    { key: 'glow', label: 'Glow' },
  ];

  // Helper to get highlight style for elements based on hovered color
  const getHighlightStyle = (elementColorKeys: ColorKey[]): React.CSSProperties => {
    if (!hoveredColor || !elementColorKeys.includes(hoveredColor)) return {};
    return {
      outline: '3px dashed #ff6b6b',
      outlineOffset: '2px',
      animation: 'pulse-highlight 1s ease-in-out infinite',
    };
  };

  // Preview component - reused for both mobile and desktop
  const PreviewCard = () => (
    <div 
      className="p-3 sm:p-4"
      style={{ 
        backgroundColor: colors.background,
        borderRadius: borderRadius,
        minHeight: '160px',
        ...getHighlightStyle(['background']),
      }}
    >
      <div 
        className="p-3 relative overflow-hidden"
        style={{ 
          backgroundColor: colors.paper,
          backgroundImage: isImageTexture(cardTexture) ? 'none' : getTextureCSS(cardTexture, textureColor, textureOpacity),
          border: `${borderWidth} ${borderStyle} ${colors.border}`,
          borderRadius: borderRadius,
          boxShadow: getShadowStyleCSS(shadowStyle, colors.glow)
            .replace(/var\(--color-shadow\)/g, colors.shadow)
            .replace(/var\(--color-border\)/g, colors.border)
            .replace(/var\(--color-glow\)/g, colors.glow),
          ...getHighlightStyle(['paper', 'border', 'shadow', 'glow']),
        }}
      >
        {/* Image texture overlay for preview */}
        {isImageTexture(cardTexture) && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: colors.paper,
              borderRadius: borderRadius,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${IMAGE_TEXTURES[cardTexture]})`,
                backgroundSize: 'cover',
                filter: 'grayscale(100%)',
                opacity: textureOpacity,
                mixBlendMode: 'overlay',
                borderRadius: borderRadius,
              }}
            />
          </div>
        )}
        <h4 
          className="text-base font-bold mb-1.5 relative"
          style={{ 
            color: colors.ink, 
            fontFamily: headingFont,
            ...getHighlightStyle(['ink']),
          }}
        >
          {icon} {name}
        </h4>
        <p 
          className="text-xs mb-3 relative line-clamp-2"
          style={{ 
            color: colors.muted, 
            fontFamily: bodyFont,
            ...getHighlightStyle(['muted']),
          }}
        >
          {description}
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            className="px-3 py-1.5 text-xs font-bold transition-colors relative"
            style={{ 
              backgroundColor: colors.accent,
              color: colors.paper,
              borderRadius: buttonRadius,
              fontFamily: headingFont,
              ...getHighlightStyle(['accent']),
            }}
          >
            Primary
          </button>
          <button
            className="px-3 py-1.5 text-xs font-bold transition-colors relative"
            style={{ 
              backgroundColor: colors.accentHover,
              color: colors.paper,
              borderRadius: buttonRadius,
              fontFamily: headingFont,
              ...getHighlightStyle(['accentHover']),
            }}
          >
            Hover
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div 
        className="bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme w-full max-w-5xl max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] flex flex-col overflow-hidden animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 px-3 sm:px-4 border-b-[length:var(--border-width)] border-theme-border bg-theme-paper flex items-center justify-between gap-3 flex-shrink-0">
          <div className="min-w-0 flex items-baseline gap-2">
            <h2 className="text-base font-bold text-theme-ink font-heading whitespace-nowrap">
              {isEditing ? 'Edit Theme' : 'Create Theme'}
            </h2>
            <span className="text-xs text-theme-muted font-body truncate">{name}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center text-theme-muted hover:text-theme-ink hover:bg-theme-background rounded-button transition-colors"
            aria-label="Close theme editor"
            title="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] flex-1 min-h-0 overflow-hidden">
          {/* Preview */}
          <div className="w-full flex-shrink-0 border-b-[length:var(--border-width)] lg:border-b-0 lg:border-r-[length:var(--border-width)] border-theme-border p-3 sm:p-4 bg-theme-background/50 lg:overflow-y-auto">
            <style>{`
              @keyframes pulse-highlight {
                0%, 100% { outline-color: #ff6b6b; }
                50% { outline-color: #ffb347; }
              }
            `}</style>
            <h3 className="text-[11px] font-bold text-theme-muted mb-2 uppercase tracking-wider font-heading">Live Preview</h3>
            <div className="max-w-md mx-auto lg:max-w-none">
              <PreviewCard />
            </div>
          </div>

          {/* Form - scrollable */}
          <div className="min-w-0 overflow-y-auto p-3 sm:p-4 space-y-4">
            {/* Basic Info Section */}
            <section>
              <h3 className="text-[11px] font-bold text-theme-ink mb-2 pb-1.5 border-b border-theme-border uppercase tracking-wider font-heading">Identity</h3>
              <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-2.5">
                {/* Name */}
                <div className="col-start-2 row-start-1">
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">Theme Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink rounded-theme font-body"
                    placeholder="My Custom Theme"
                  />
                </div>

                {/* Icon */}
                <div className="relative col-start-1 row-start-1">
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">Icon</label>
                  <button
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="w-full h-[38px] border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink rounded-theme flex items-center justify-center hover:bg-theme-background transition-colors"
                    aria-label="Choose theme icon"
                  >
                    <span className="text-xl">{icon}</span>
                  </button>
                  {showIconPicker && (
                    <div className="absolute top-full left-0 mt-1 p-2 w-64 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme z-20 grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                      {ICON_OPTIONS.map((ic) => (
                        <button
                          key={ic}
                          onClick={() => {
                            setIcon(ic);
                            setShowIconPicker(false);
                          }}
                          className={`p-1 text-lg hover:bg-theme-accent hover:text-theme-paper rounded ${icon === ic ? 'bg-theme-accent text-theme-paper' : ''}`}
                        >
                          {ic}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2 border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink rounded-theme font-body"
                    placeholder="A personalized theme"
                  />
                </div>
              </div>
            </section>

            {/* Colors Section */}
            <section>
              <h3 className="text-[11px] font-bold text-theme-ink mb-2 pb-1.5 border-b border-theme-border uppercase tracking-wider font-heading">Palette</h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5 gap-2">
                {colorFields.map(({ key, label }) => (
                  <div 
                    key={key} 
                    className="flex flex-col items-center"
                    onMouseEnter={() => setHoveredColor(key)}
                    onMouseLeave={() => setHoveredColor(null)}
                  >
                    <label className="block text-[10px] font-bold text-theme-muted mb-1 font-body text-center truncate w-full">{label}</label>
                    <input
                      type="color"
                      value={colors[key]}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="w-9 h-9 border-[length:var(--border-width)] border-theme-border rounded-theme cursor-pointer"
                      style={{
                        outline: hoveredColor === key ? '2px solid var(--color-accent)' : undefined,
                        outlineOffset: hoveredColor === key ? '2px' : undefined,
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Fonts Section */}
            <section>
              <h3 className="text-[11px] font-bold text-theme-ink mb-2 pb-1.5 border-b border-theme-border uppercase tracking-wider font-heading">Typography</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">Heading Font</label>
                  <select
                    value={headingFont}
                    onChange={(e) => setHeadingFont(e.target.value)}
                    className="w-full p-2 border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink rounded-theme"
                    style={{ fontFamily: headingFont }}
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">Body Font</label>
                  <select
                    value={bodyFont}
                    onChange={(e) => setBodyFont(e.target.value)}
                    className="w-full p-2 border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink rounded-theme"
                    style={{ fontFamily: bodyFont }}
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Style Section */}
            <section>
              <h3 className="text-[11px] font-bold text-theme-ink mb-2 pb-1.5 border-b border-theme-border uppercase tracking-wider font-heading">Surface</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">Card Border Radius</label>
                  <select
                    value={borderRadius}
                    onChange={(e) => setBorderRadius(e.target.value)}
                    className="w-full p-2 border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink rounded-theme font-body"
                  >
                    <option value="0px">Sharp (0px)</option>
                    <option value="2px">Subtle (2px)</option>
                    <option value="4px">Small (4px)</option>
                    <option value="8px">Medium (8px)</option>
                    <option value="12px">Large (12px)</option>
                    <option value="16px">Extra Large (16px)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">Button Border Radius</label>
                  <select
                    value={buttonRadius}
                    onChange={(e) => setButtonRadius(e.target.value)}
                    className="w-full p-2 border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink rounded-theme font-body"
                  >
                    <option value="0px">Sharp (0px)</option>
                    <option value="2px">Subtle (2px)</option>
                    <option value="4px">Small (4px)</option>
                    <option value="8px">Medium (8px)</option>
                    <option value="12px">Large (12px)</option>
                    <option value="16px">Extra Large (16px)</option>
                    <option value="9999px">Pill (Full)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">Border Width</label>
                  <select
                    value={borderWidth}
                    onChange={(e) => setBorderWidth(e.target.value)}
                    className="w-full p-2 border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink rounded-theme font-body"
                  >
                    <option value="0px">None (0px)</option>
                    <option value="1px">Thin (1px)</option>
                    <option value="2px">Medium (2px)</option>
                    <option value="3px">Thick (3px)</option>
                    <option value="4px">Extra Thick (4px)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">Border Style</label>
                  <select
                    value={borderStyle}
                    onChange={(e) => setBorderStyle(e.target.value)}
                    className="w-full p-2 border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink rounded-theme font-body"
                  >
                    {BORDER_STYLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">Shadow Style</label>
                  <select
                    value={shadowStyle}
                    onChange={(e) => setShadowStyle(e.target.value)}
                    className="w-full p-2 border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink rounded-theme font-body"
                  >
                    {SHADOW_STYLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">Card Texture</label>
                  <select
                    value={cardTexture}
                    onChange={(e) => setCardTexture(e.target.value)}
                    className="w-full p-2 border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink rounded-theme font-body"
                  >
                    {TEXTURE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 xl:col-span-3">
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">
                    Texture Opacity: {Math.round(textureOpacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={textureOpacity}
                    onChange={(e) => setTextureOpacity(parseFloat(e.target.value))}
                    className="w-full h-2 bg-theme-border rounded-theme appearance-none cursor-pointer"
                    disabled={cardTexture === 'none'}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-4 py-2.5 border-t-[length:var(--border-width)] border-theme-border bg-theme-paper flex gap-2 justify-between items-center flex-shrink-0">
          <div>
            {isEditing && onDelete && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this custom theme?')) {
                    onDelete();
                  }
                }}
                className="px-2.5 py-2 text-red-600 text-xs font-bold rounded-button hover:bg-red-500 hover:text-white transition-colors font-heading flex items-center gap-1.5"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-2 border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink text-xs font-bold rounded-button hover:bg-theme-background transition-colors font-heading"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-2 bg-theme-accent text-theme-paper text-xs font-bold rounded-button hover:bg-theme-accent-hover transition-colors font-heading flex items-center gap-1.5"
            >
              <CheckIcon className="w-4 h-4" />
              {isEditing ? 'Save Changes' : 'Create Theme'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

