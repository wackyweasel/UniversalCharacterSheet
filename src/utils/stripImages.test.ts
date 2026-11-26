import { describe, expect, it } from 'vitest';
import type { Character, Widget } from '../types';
import { stripImages } from './stripImages';

function characterWith(widget: Widget): Character {
  return { id: 'c', name: 'Test', activeSheetId: 's', sheets: [{ id: 's', name: 'Sheet', widgets: [widget] }] } as unknown as Character;
}

describe('stripImages', () => {
  it('removes grid map background and token images but keeps the rest', () => {
    const widget = {
      id: 'w',
      type: 'GRID_MAP',
      data: {
        gridMapBackgroundImage: 'data:image/webp;base64,AAAA',
        gridMapBackgroundColor: '#112233',
        gridMapTokens: [{ id: 't', name: 'Hero', color: '#fff', column: 1, row: 2, image: 'data:image/webp;base64,BBBB' }],
      },
    } as unknown as Widget;

    const data = stripImages(characterWith(widget)).sheets[0].widgets[0].data;

    expect(data.gridMapBackgroundImage).toBeUndefined();
    expect(data.gridMapBackgroundColor).toBe('#112233');
    expect(data.gridMapTokens).toEqual([expect.objectContaining({ id: 't', name: 'Hero', column: 1, row: 2 })]);
    expect(data.gridMapTokens?.[0].image).toBeUndefined();
  });

  it('removes image widget urls', () => {
    const widget = { id: 'w', type: 'IMAGE', data: { imageUrl: 'data:image/png;base64,AAAA' } } as unknown as Widget;
    expect(stripImages(characterWith(widget)).sheets[0].widgets[0].data.imageUrl).toBeUndefined();
  });
});
