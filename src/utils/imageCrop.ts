import type { CSSProperties } from 'react';
import type { WidgetData } from '../types';

export interface ImageCropInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface Size {
  width: number;
  height: number;
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export function getImageCrop(data: WidgetData): ImageCropInsets {
  const hasEdgeCrop = data.imageCropTop !== undefined
    || data.imageCropRight !== undefined
    || data.imageCropBottom !== undefined
    || data.imageCropLeft !== undefined;

  if (hasEdgeCrop) {
    return {
      top: clamp(data.imageCropTop ?? 0),
      right: clamp(data.imageCropRight ?? 0),
      bottom: clamp(data.imageCropBottom ?? 0),
      left: clamp(data.imageCropLeft ?? 0),
    };
  }

  const zoom = Math.max(100, data.imageZoom ?? 100);
  const totalCrop = 100 - (10000 / zoom);
  const horizontalBias = clamp(data.imageCropX ?? 50) / 100;
  const verticalBias = clamp(data.imageCropY ?? 50) / 100;

  return {
    top: totalCrop * verticalBias,
    right: totalCrop * (1 - horizontalBias),
    bottom: totalCrop * (1 - verticalBias),
    left: totalCrop * horizontalBias,
  };
}

export function getCroppedMediaStyle(
  crop: ImageCropInsets,
  source: Size,
  target: Size,
): CSSProperties {
  if (source.width <= 0 || source.height <= 0 || target.width <= 0 || target.height <= 0) {
    return { height: '100%', objectFit: 'cover', width: '100%' };
  }

  const visibleWidth = Math.max(1, 100 - crop.left - crop.right);
  const visibleHeight = Math.max(1, 100 - crop.top - crop.bottom);
  const cropWidth = source.width * visibleWidth / 100;
  const cropHeight = source.height * visibleHeight / 100;
  const cropCenterX = source.width * (crop.left + visibleWidth / 2) / 100;
  const cropCenterY = source.height * (crop.top + visibleHeight / 2) / 100;
  const scale = Math.max(target.width / cropWidth, target.height / cropHeight);

  return {
    height: source.height * scale,
    left: target.width / 2 - cropCenterX * scale,
    maxWidth: 'none',
    objectFit: 'fill',
    position: 'absolute',
    top: target.height / 2 - cropCenterY * scale,
    width: source.width * scale,
  };
}