import { Children, isValidElement, useState, type ReactNode } from 'react';
import { ChevronDownIcon } from '../icons';

type CollapsibleSectionProps = {
  title?: ReactNode;
  count?: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
};

function getClassName(child: ReactNode) {
  if (!isValidElement(child)) return '';
  return typeof child.props.className === 'string' ? child.props.className : '';
}

function isHeadingChild(child: ReactNode): boolean {
  if (!isValidElement(child)) return false;
  const className = getClassName(child);
  return child.type === 'legend'
    || child.type === 'h3'
    || (child.type === 'div' && Children.toArray(child.props.children).some((nestedChild) => isHeadingChild(nestedChild)))
    || className.includes('widget-editor__section-heading')
    || className.includes('widget-editor__section-title');
}

export function CollapsibleSection({
  title,
  count,
  children,
  className,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const childArray = Children.toArray(children);
  const firstChild = childArray[0];
  const hasHeadingChild = isHeadingChild(firstChild);
  const existingHeading = hasHeadingChild && isValidElement(firstChild)
    ? getClassName(firstChild).includes('widget-editor__section-heading')
      || (firstChild.type === 'div' && Children.toArray(firstChild.props.children).some((nestedChild) => isHeadingChild(nestedChild)))
      ? firstChild.props.children
      : firstChild
    : null;
  const heading = title ?? existingHeading ?? 'Section';
  const sectionChildren = hasHeadingChild ? childArray.slice(1) : childArray;
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      className={['widget-editor__section', className].filter(Boolean).join(' ')}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary
        className="widget-editor__section-heading"
        onClick={(event) => {
          const target = event.target as Element;
          if (target.closest('button, a, input, select, textarea, [role="button"]')) {
            event.preventDefault();
          }
        }}
      >
        {typeof heading === 'string' ? (
          <h3 className="widget-editor__section-title">{heading}</h3>
        ) : (
          heading
        )}
        {count !== undefined && <span className="widget-editor__section-count">{count}</span>}
        <ChevronDownIcon className="widget-editor__collapse-icon" aria-hidden="true" />
      </summary>
      <div className="widget-editor__section-content">
        {sectionChildren}
      </div>
    </details>
  );
}