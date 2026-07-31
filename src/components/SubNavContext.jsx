import React, { createContext, useContext, useState, useCallback } from 'react';

const SubNavContext = createContext({ tabs: [], setTabs: () => {} });

export function SubNavProvider({ children }) {
  const [tabs, setTabsRaw] = useState([]);

  // Stable setter — pages call this in a useEffect to register tabs
  const setTabs = useCallback((newTabs) => {
    setTabsRaw(newTabs);
  }, []);

  return (
    <SubNavContext.Provider value={{ tabs, setTabs }}>
      {children}
    </SubNavContext.Provider>
  );
}

export function useSubNav() {
  return useContext(SubNavContext);
}
