import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material/styles";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem("vl_theme_mode") || "dark";
  });

  const toggleTheme = () => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    localStorage.setItem("vl_theme_mode", mode);
    const root = document.documentElement;
    if (mode === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [mode]);

  const muiTheme = useMemo(() => {
    const isDark = mode === "dark";
    return createTheme({
      palette: {
        mode,
        primary: {
          main: isDark ? "#F59E0B" : "#D97706",
          contrastText: "#0B0F17",
        },
        secondary: {
          main: isDark ? "#14B8A6" : "#0D9488",
          contrastText: "#FFFFFF",
        },
        error: {
          main: "#E11D48",
        },
        background: {
          default: isDark ? "#0B0F17" : "#F7F5F0",
          paper: isDark ? "#131A26" : "#FFFFFF",
        },
        text: {
          primary: isDark ? "#F3F4F6" : "#0F172A",
          secondary: isDark ? "#94A3B8" : "#64748B",
        },
      },
      typography: {
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      },
      shape: {
        borderRadius: 10,
      },
      components: {
        MuiDataGrid: {
          styleOverrides: {
            root: {
              border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(15, 23, 42, 0.08)",
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(19, 26, 38, 0.85)" : "#FFFFFF",
              color: isDark ? "#F3F4F6" : "#0F172A",
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: isDark ? "#101622" : "#F1F5F9",
                borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(15, 23, 42, 0.08)",
                fontSize: "0.825rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 600,
                color: isDark ? "#F59E0B" : "#D97706",
              },
              "& .MuiDataGrid-row": {
                borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.04)" : "1px solid rgba(15, 23, 42, 0.04)",
                "&:hover": {
                  backgroundColor: isDark ? "rgba(245, 158, 11, 0.06)" : "rgba(217, 119, 6, 0.04)",
                },
              },
              "& .MuiDataGrid-cell": {
                fontSize: "0.875rem",
              },
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: "none",
            },
          },
        },
      },
    });
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, isDark: mode === "dark" }}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
