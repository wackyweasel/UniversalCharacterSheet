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

interface CustomThemeEditorProps {
  theme?: CustomTheme; // If provided, we're editing; otherwise creating new
  onSave: (theme: CustomTheme) => void;
  onCancel: () => void;
  onDelete?: () => void; // Only for editing existing themes
}

export default function CustomThemeEditor({ theme, onSave, onCancel, onDelete }: CustomThemeEditorProps) {
  const isEditing = !!theme;
  const defaultTheme = createDefaultCustomTheme();
  
  const [name, setName] = useState(theme?.name || defaultTheme.name);
  const [icon, setIcon] = useState(theme?.icon || defaultTheme.icon);
  const [description, setDescription] = useState(theme?.description || defaultTheme.description);
  const [colors, setColors] = useState(theme?.colors || defaultTheme.colors);
  const [headingFont, setHeadingFont] = useState(theme?.fonts.heading || defaultTheme.fonts.heading);
  const [bodyFont, setBodyFont] = useState(theme?.fonts.body || defaultTheme.fonts.body);
  const [borderRadius, setBorderRadius] = useState(theme?.borderRadius || defaultTheme.borderRadius);
  const [borderWidth, setBorderWidth] = useState(theme?.borderWidth || defaultTheme.borderWidth);
  const [shadowStyle, setShadowStyle] = useState(theme?.shadowStyle || defaultTheme.shadowStyle);
  const [cardTexture, setCardTexture] = useState(theme?.cardTexture || defaultTheme.cardTexture);
  const textureColor = '#ffffff'; // Fixed white texture color
  const [textureOpacity, setTextureOpacity] = useState(theme?.textureOpacity ?? defaultTheme.textureOpacity);
  const [borderStyle, setBorderStyle] = useState(theme?.borderStyle || defaultTheme.borderStyle);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const handleColorChange = (key: keyof typeof colors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const newTheme: CustomTheme = {
      id: theme?.id || `custom-${uuidv4()}`,
      name,
      icon,
      description,
      colors,
      fonts: {
        heading: headingFont,
        body: bodyFont,
      },
      borderRadius,
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

  // Preview component - reused for both mobile and desktop
  const PreviewCard = () => (
    <div 
      className="p-3"
      style={{ 
        backgroundColor: colors.background,
        borderRadius: borderRadius,
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
          className="text-base font-bold mb-2 relative"
          style={{ color: colors.ink, fontFamily: headingFont }}
        >
          {icon} {name}
        </h4>
        <p 
          className="text-xs mb-3 relative"
          style={{ color: colors.muted, fontFamily: bodyFont }}
        >
          {description}
        </p>
        <button
          className="px-3 py-1.5 text-sm font-bold transition-colors relative"
          style={{ 
            backgroundColor: colors.accent,
            color: colors.paper,
            borderRadius: borderRadius,
            fontFamily: headingFont,
          }}
        >
          Sample Button
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-2">
      <div 
        className="bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme w-full max-w-4xl max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3 border-b-[length:var(--border-width)] border-theme-border bg-theme-paper flex-shrink-0">
          <h2 className="text-lg font-bold text-theme-ink font-heading">
            {isEditing ? '✏️ Edit Custom Theme' : '🎨 Create Custom Theme'}
          </h2>
        </div>

        {/* Content - Column layout */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Preview - at top */}
          <div className="w-full flex-shrink-0 border-b-[length:var(--border-width)] border-theme-border p-3 bg-theme-background/50 max-h-[40vh] overflow-auto">
            <h3 className="text-sm font-bold text-theme-ink mb-2 uppercase tracking-wider font-heading">Preview</h3>
            <div>
              <PreviewCard />
            </div>
          </div>

          {/* Form - scrollable */}
          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            {/* Basic Info Section */}
            <section>
              <h3 className="text-sm font-bold text-theme-ink mb-3 uppercase tracking-wider font-heading">Basic Info</h3>
              <div className="grid grid-cols-1 gap-3">
                {/* Name */}
                <div>
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
                <div className="relative">
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">Icon</label>
                  <button
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="w-full p-2 border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink rounded-theme font-body text-left flex items-center gap-2"
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="text-xs text-theme-muted">Click to change</span>
                  </button>
                  {showIconPicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-theme-paper border-[length:var(--border-width)] border-theme-border shadow-theme rounded-theme z-20 grid grid-cols-10 gap-1 max-h-40 overflow-y-auto">
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
                <div>
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
              <h3 className="text-sm font-bold text-theme-ink mb-3 uppercase tracking-wider font-heading">Colors</h3>
              <div className="grid grid-cols-3 gap-2">
                {colorFields.map(({ key, label }) => (
                  <div key={key} className="flex flex-col items-center">
                    <label className="block text-[10px] font-bold text-theme-muted mb-1 font-body text-center">{label}</label>
                    <input
                      type="color"
                      value={colors[key]}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="w-10 h-10 border-[length:var(--border-width)] border-theme-border rounded-theme cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Fonts Section */}
            <section>
              <h3 className="text-sm font-bold text-theme-ink mb-3 uppercase tracking-wider font-heading">Fonts</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">Heading Font</label>
                  <select
                    value={headingFont}
                    onChange={(e) => setHeadingFont(e.target.value)}
                    className="w-full p-2 border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink rounded-theme font-body"
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-theme-muted mt-1" style={{ fontFamily: headingFont }}>
                    Preview: The quick brown fox
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">Body Font</label>
                  <select
                    value={bodyFont}
                    onChange={(e) => setBodyFont(e.target.value)}
                    className="w-full p-2 border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink rounded-theme font-body"
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-theme-muted mt-1" style={{ fontFamily: bodyFont }}>
                    Preview: The quick brown fox
                  </p>
                </div>
              </div>
            </section>

            {/* Style Section */}
            <section>
              <h3 className="text-sm font-bold text-theme-ink mb-3 uppercase tracking-wider font-heading">Style</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">Border Radius</label>
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
                  <label className="block text-xs font-bold text-theme-muted mb-1 font-body">Border Width</label>
                  <select
                    value={borderWidth}
                    onChange={(e) => setBorderWidth(e.target.value)}
                    className="w-full p-2 border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink rounded-theme font-body"
                  >
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
                <div>
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
        <div className="p-3 border-t-[length:var(--border-width)] border-theme-border bg-theme-paper flex flex-wrap gap-2 justify-between flex-shrink-0">
          <div>
            {isEditing && onDelete && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this custom theme?')) {
                    onDelete();
                  }
                }}
                className="px-3 py-2 bg-red-500 text-white text-sm font-bold rounded-theme hover:bg-red-600 transition-colors font-heading"
              >
                🗑️ Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-2 border-[length:var(--border-width)] border-theme-border bg-theme-paper text-theme-ink text-sm font-bold rounded-theme hover:bg-theme-accent hover:text-theme-paper transition-colors font-heading"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-2 bg-theme-accent text-theme-paper text-sm font-bold rounded-theme hover:bg-theme-accent-hover transition-colors font-heading"
            >
              {isEditing ? '💾 Save Changes' : '✨ Create Theme'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
