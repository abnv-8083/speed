import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { LayoutGrid, Plus, History, Settings } from 'lucide-react';
import { useSubNav } from '../../components/SubNavContext';

const PRINTING_TABS = [
  { to: '/printing/stock',   icon: LayoutGrid, label: 'Stock Overview' },
  { to: '/printing/log',     icon: Plus,       label: 'Log a Job'      },
  { to: '/printing/history', icon: History,    label: 'Print History'  },
  { to: '/printing/setup',   icon: Settings,   label: 'Printer Setup'  },
];

export default function PrintingLayout() {
  const { setTabs } = useSubNav();

  useEffect(() => {
    setTabs(PRINTING_TABS);
    return () => setTabs([]);
  }, [setTabs]);

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <Outlet />
    </div>
  );
}
