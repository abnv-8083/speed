import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PenLine, FolderOpen } from 'lucide-react';
import { useSubNav } from '../../components/SubNavContext';

const CV_TABS = [
  { to: '/cv',       icon: PenLine,    label: 'CV Editor'  },
  { to: '/cv/saved', icon: FolderOpen, label: 'Saved CVs'  },
];

export default function CVLayout() {
  const { setTabs } = useSubNav();
  const location    = useLocation();

  useEffect(() => {
    setTabs(CV_TABS);
    return () => setTabs([]);
  }, [setTabs]);

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <Outlet />
    </div>
  );
}
