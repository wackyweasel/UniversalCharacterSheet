import { Widget } from '../../types';

export interface EditorProps {
  widget: Widget;
  updateData: (data: any) => void;
  updateWidth?: (width: number) => void;
}
