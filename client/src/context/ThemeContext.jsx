import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("app_theme") || "dark";
  });

  const location = useLocation();

  useEffect(() => {
    // Home page ('/') always stays in dark Ember Forge theme
    const activeTheme = location.pathname === "/" ? "dark" : theme;
    document.documentElement.setAttribute("data-bs-theme", activeTheme);
    document.documentElement.setAttribute("data-theme", activeTheme);
    localStorage.setItem("app_theme", theme);
  }, [theme, location.pathname]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
