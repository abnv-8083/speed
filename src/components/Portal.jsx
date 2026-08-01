import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into document.body via a React Portal.
 * This escapes any overflow:hidden / stacking context in the layout,
 * ensuring modals always appear above everything.
 */
export default function Portal({ children }) {
  const el = useRef(document.createElement('div'));

  useEffect(() => {
    const target = el.current;
    document.body.appendChild(target);
    return () => document.body.removeChild(target);
  }, []);

  return createPortal(children, el.current);
}
