import React, { createContext, useContext, useState, ReactNode } from "react";

interface MenuContextType {
  menuVisible: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <MenuContext.Provider
      value={{
        menuVisible,
        openMenu: () => setMenuVisible(true),
        closeMenu: () => setMenuVisible(false),
      }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error("useMenu must be used within a MenuProvider");
  }
  return context;
}
