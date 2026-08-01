import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { FileImage, Minimize2, Crop } from 'lucide-react';
import { useSubNav } from '../../components/SubNavContext';

const TOOLS_TABS = [
  { to: '/tools/convert', icon: FileImage,  label: 'File Converter' },
  { to: '/tools/size',    icon: Minimize2,  label: 'Size Tools'     },
  { to: '/tools/image',   icon: Crop,       label: 'Image Editor'   },
];

export default function ToolsLayout() {
  const { setTabs } = useSubNav();

  useEffect(() => {
    setTabs(TOOLS_TABS);
    return () => setTabs([]);
  }, [setTabs]);

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <Outlet />
    </div>
  );
}
