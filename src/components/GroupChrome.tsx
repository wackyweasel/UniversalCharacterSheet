import { flushSync } from 'react-dom';
import { useId, useLayoutEffect, useMemo, useState } from 'react';
import { Widget } from '../types';
import { useStore } from '../store/useStore';
import { usePrintStore } from '../store/usePrintStore';
import { useSheetSettingsStore } from '../store/useSheetSettingsStore';
import { isImageTexture, IMAGE_TEXTURES, getBuiltInTheme } from '../store/useThemeStore';
import { useCustomThemeStore } from '../store/useCustomThemeStore';
import {
  calculateCornerRounding,
  buildGroupShapePath,
  getSharedEdgeBridges,
  groupAttachedRects,
  type WidgetRect,
} from '../utils/groupChrome';

interface Props {
  widgets: Widget[];
  scale: number;
}

const DEFAULT_Z_INDEX = 10;
const TRANSLATE_PATTERN = /translate\(\s*(-?[\d.]+(?:e-?\d+)?)px,\s*(-?[\d.]+(?:e-?\d+)?)px\)/;

function measureRects(widgets: Widget[]): WidgetRect[] {
  const rects: WidgetRect[] = [];
  for (const widget of widgets) {
    if (!widget.attachedTo?.length) continue;
    const element = document.querySelector<HTMLElement>(`.canvas-widget[data-widget-id="${widget.id}"]`);
    if (!element) continue;
    // Drags and resize previews move the element without touching the store.
    const translate = TRANSLATE_PATTERN.exec(element.style.transform);
    rects.push({
      id: widget.id,
      x: translate ? Number(translate[1]) : widget.x,
      y: translate ? Number(translate[2]) : widget.y,
      width: element.offsetWidth,
      height: element.offsetHeight,
      attachedTo: widget.attachedTo,
    });
  }
  return rects;
}

const px = (value: number) => `${value}px`;

// Margin around the group that the mask must cover, so a thick border is never cut off.
const OUTLINE_MARGIN = 64;

// Strokes the group's shape, then masks out its interior, leaving only the outer half of the stroke. Nothing is
// drawn under translucent paper, so no line shows through at the seams between attached widgets.
function GroupOutline({ shape, bounds }: { shape: string; bounds: PlainRectLike }) {
  const maskId = `group-outline-${useId().replace(/:/g, '')}`;
  return (
    <svg
      className="group-chrome__outline"
      style={{ left: px(bounds.x), top: px(bounds.y), width: px(bounds.width), height: px(bounds.height) }}
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={-OUTLINE_MARGIN}
          y={-OUTLINE_MARGIN}
          width={bounds.width + 2 * OUTLINE_MARGIN}
          height={bounds.height + 2 * OUTLINE_MARGIN}
        >
          <rect
            x={-OUTLINE_MARGIN}
            y={-OUTLINE_MARGIN}
            width={bounds.width + 2 * OUTLINE_MARGIN}
            height={bounds.height + 2 * OUTLINE_MARGIN}
            fill="white"
          />
          <path d={shape} fill="black" />
        </mask>
      </defs>
      <path d={shape} fill="none" mask={`url(#${maskId})`} />
    </svg>
  );
}

type PlainRectLike = { x: number; y: number; width: number; height: number };

/**
 * Draws the chrome of attached widgets once per group when "hide attached edges" is on: one outline around the
 * union of the widgets, with one paper fill and texture inside. The widgets themselves only render content.
 * Layers, bottom to top: outline (outside the union only), paper, texture overlay.
 */
export default function GroupChrome({ widgets, scale }: Props) {
  const hideAttachedEdges = useSheetSettingsStore((state) => state.hideAttachedEdges);
  const bordersDisabled = usePrintStore((state) => state.bordersDisabled);
  const textureDisabled = usePrintStore((state) => state.textureDisabled);
  const mode = useStore((state) => state.mode);
  const activeTheme = useStore((state) => (
    state.characters.find((character) => character.id === state.activeCharacterId)?.theme
  ));
  const customCardTexture = useCustomThemeStore((state) => (
    activeTheme ? state.customThemes.find((theme) => theme.id === activeTheme)?.cardTexture : undefined
  ));
  const textureKey = customCardTexture || (activeTheme ? getBuiltInTheme(activeTheme)?.cardTexture : undefined) || 'none';
  const hasImageTexture = isImageTexture(textureKey) && !textureDisabled && mode !== 'print';

  const [rects, setRects] = useState<WidgetRect[]>([]);
  // The texture clip needs the corner radius as a number, but themes only expose it as a CSS variable.
  const [borderRadius, setBorderRadius] = useState(0);
  useLayoutEffect(() => {
    const root = document.documentElement;
    const read = () => {
      const parsed = parseFloat(root.style.getPropertyValue('--border-radius') || getComputedStyle(root).getPropertyValue('--border-radius'));
      setBorderRadius(Number.isFinite(parsed) ? parsed : 0);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, []);
  const members = useMemo(() => (
    hideAttachedEdges ? widgets.filter((widget) => widget.attachedTo?.length) : []
  ), [hideAttachedEdges, widgets]);
  const memberKey = members.map((widget) => widget.id).join('|');

  useLayoutEffect(() => {
    const next = measureRects(members);
    setRects((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
  });

  // Keeps the shape in step with content-driven sizes, resize previews and drags, which bypass React renders.
  useLayoutEffect(() => {
    if (!memberKey) return;
    const elements = memberKey.split('|')
      .map((id) => document.querySelector<HTMLElement>(`.canvas-widget[data-widget-id="${id}"]`))
      .filter((element): element is HTMLElement => !!element);
    const sync = () => {
      const next = measureRects(members);
      flushSync(() => setRects((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next)));
    };
    const resizeObserver = new ResizeObserver(sync);
    const mutationObserver = new MutationObserver(sync);
    for (const element of elements) {
      resizeObserver.observe(element);
      mutationObserver.observe(element, { attributes: true, attributeFilter: ['style'] });
    }
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
    // `members` is read through the key: it changes whenever the set of grouped widgets does.
  }, [memberKey]);

  const groups = useMemo(() => {
    const zIndexById = new Map(widgets.map((widget) => [widget.id, widget.zIndex ?? DEFAULT_Z_INDEX]));
    // Bridges must reach past a shared edge by at least a device pixel to cover its anti-aliasing at this zoom.
    const overlap = Math.max(1, 1.5 / scale);
    return groupAttachedRects(rects).map((group) => {
      const minX = Math.min(...group.map((rect) => rect.x));
      const minY = Math.min(...group.map((rect) => rect.y));
      const bounds = {
        x: minX,
        y: minY,
        width: Math.max(...group.map((rect) => rect.x + rect.width)) - minX,
        height: Math.max(...group.map((rect) => rect.y + rect.height)) - minY,
      };
      const members = group.map((rect) => ({ rect, corners: calculateCornerRounding(rect, group) }));
      const bridges = getSharedEdgeBridges(group, overlap);
      return {
        id: group.map((rect) => rect.id).join('|'),
        zIndex: Math.min(...group.map((rect) => zIndexById.get(rect.id) ?? DEFAULT_Z_INDEX)),
        bounds,
        members,
        bridges,
        shape: buildGroupShapePath(members, bridges, bounds, borderRadius),
      };
    });
  }, [rects, widgets, scale, borderRadius]);

  if (!hideAttachedEdges || groups.length === 0) return null;

  return (
    <div className="pointer-events-none">
      {groups.map((group) => (
        <div key={group.id} className="group-chrome" style={{ zIndex: group.zIndex }} data-group-chrome="">
          {!bordersDisabled && <GroupOutline shape={group.shape} bounds={group.bounds} />}
          {/* One fill per group: paper can be translucent, so overlapping per-widget fills would show darker seams. */}
          <div
            className="group-chrome__paper"
            style={{
              left: px(group.bounds.x),
              top: px(group.bounds.y),
              width: px(group.bounds.width),
              height: px(group.bounds.height),
              clipPath: `path("${group.shape}")`,
            }}
          />
          {/*
            One texture per group, blended directly against the flat paper below and clipped to the group's shape
            as a single path. Clipping each widget separately would leave an anti-aliased hairline on every seam.
          */}
          {hasImageTexture && (
            <div
              className="widget-texture-effect group-chrome__texture"
              style={{
                left: px(group.bounds.x),
                top: px(group.bounds.y),
                width: px(group.bounds.width),
                height: px(group.bounds.height),
                backgroundImage: `url(${IMAGE_TEXTURES[textureKey]})`,
                clipPath: `path("${group.shape}")`,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
