import { createElement, type CSSProperties, type ReactNode } from 'react';
import type { Widget } from '../types';
import { InlineDiceText } from './InlineDiceText';

interface Props {
  html: string;
  widget: Widget;
}

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'ul', 'ol', 'li',
  'blockquote', 'code', 'pre', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span',
]);

export function InlineDiceRichText({ html, widget }: Props) {
  if (!html) return null;

  const documentNode = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const container = documentNode.body.firstElementChild;
  if (!container) return null;

  const renderNode = (node: Node, key: string): ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) {
      return <InlineDiceText key={key} text={node.textContent || ''} widget={widget} />;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    const children = Array.from(element.childNodes).map((child, index) => renderNode(child, `${key}-${index}`));
    if (!ALLOWED_TAGS.has(tagName)) return children;

    const props: { key: string; style?: CSSProperties } = { key };
    if (tagName === 'span' && element.style.color) {
      props.style = { color: element.style.color };
    }
    return createElement(tagName, props, children);
  };

  return <>{Array.from(container.childNodes).map((node, index) => renderNode(node, String(index)))}</>;
}