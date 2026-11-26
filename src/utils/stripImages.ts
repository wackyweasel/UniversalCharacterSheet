import { Character, Widget } from '../types';

/**
 * Creates a copy of a character without user-uploaded images (IMAGE widgets, grid map backgrounds and token art).
 * This is used for telemetry, exports and gallery submissions.
 */
export function stripImages(character: Character): Character {
  return {
    ...character,
    sheets: character.sheets.map(sheet => ({
      ...sheet,
      widgets: sheet.widgets.map(widget => stripWidgetImage(widget))
    }))
  };
}

export function stripWidgetImage(widget: Widget): Widget {
  if (widget.type === 'GRID_MAP') {
    const { gridMapTokens } = widget.data;
    return {
      ...widget,
      data: {
        ...widget.data,
        gridMapBackgroundImage: undefined,
        ...(gridMapTokens ? { gridMapTokens: gridMapTokens.map((token) => ({ ...token, image: undefined })) } : {}),
      },
    };
  }

  if (widget.type === 'IMAGE') {
    return {
      ...widget,
      data: {
        ...widget.data,
        imageUrl: undefined // Remove the image URL/base64 data
      }
    };
  }
  
  // For MAP_SKETCHER, we might have shapes with image data
  if (widget.type === 'MAP_SKETCHER' && widget.data.mapShapes) {
    return {
      ...widget,
      data: {
        ...widget.data,
        mapShapes: [] // Clear map data to avoid large payloads
      }
    };
  }
  
  return widget;
}
