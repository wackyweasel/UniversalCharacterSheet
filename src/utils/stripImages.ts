import { Character, Widget } from '../types';

/**
 * Creates a deep copy of a character with all IMAGE widget URLs removed.
 * This is used for telemetry to avoid sending user-uploaded images.
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

function stripWidgetImage(widget: Widget): Widget {
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
