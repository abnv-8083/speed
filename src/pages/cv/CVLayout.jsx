import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { PenLine, FolderOpen } from 'lucide-react';
import { useSubNav } from '../../components/SubNavContext';

const CV_TABS = [
  { to: '/admin/cv',       icon: PenLine,    label: 'CV Editor', end: true },
  { to: '/admin/cv/saved', icon: FolderOpen, label: 'Saved CVs'  },
];

export default function CVLayout() {
  const { setTabs } = useSubNav();

  useEffect(() => {
    setTabs(CV_TABS);
    return () => setTabs([]);
  }, [setTabs]);

  // Pages control their own internal scrolling, so keep the wrapper inert.
  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <Outlet />
    </div>
  );
}
