import React, { useState, useEffect } from "react";

import "react-toastify/dist/ReactToastify.css";
import { QueryClient, QueryClientProvider } from "react-query";

import { enUS, ptBR, esES } from "@material-ui/core/locale";
import { createTheme, ThemeProvider } from "@material-ui/core/styles";
import { useMediaQuery } from "@material-ui/core";
import ColorModeContext from "./layout/themeContext";
import { SocketContext, SocketManager } from './context/Socket/SocketContext';

import Routes from "./routes";

const queryClient = new QueryClient();

const App = () => {
    const [locale, setLocale] = useState();

    const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
    const preferredTheme = window.localStorage.getItem("preferredTheme");
    const [mode, setMode] = useState(preferredTheme ? preferredTheme : prefersDarkMode ? "dark" : "light");

    const colorMode = React.useMemo(
        () => ({
            toggleColorMode: () => {
                setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
            },
        }),
        []
    );

    const theme = createTheme(
        {
            scrollbarStyles: {
                "&::-webkit-scrollbar": {
                    width: '8px',
                    height: '8px',
                },
                "&::-webkit-scrollbar-thumb": {
                    boxShadow: 'inset 0 0 6px rgba(0, 0, 0, 0.3)',
                    backgroundColor: mode === "light" ? "#6366F1" : "#6366F1", // Indigo
                    borderRadius: "8px",
                },
            },
            scrollbarStylesSoft: {
                "&::-webkit-scrollbar": {
                    width: "8px",
                },
                "&::-webkit-scrollbar-thumb": {
                    backgroundColor: mode === "light" ? "#CBD5E1" : "#334155", // Slate 300/700
                    borderRadius: "8px",
                },
            },
            palette: {
                type: mode,
                primary: { main: "#6366F1" }, // Indigo 500
                secondary: { main: "#8B5CF6" }, // Violet 500
                textPrimary: mode === "light" ? "#1E293B" : "#F8FAFC", // Slate 800 / Slate 50
                textSecondary: mode === "light" ? "#64748B" : "#94A3B8", // Slate 500 / Slate 400

                background: {
                    default: mode === "light" ? "#F1F5F9" : "#0F172A", // Slate 100 / Slate 900
                    paper: mode === "light" ? "#FFFFFF" : "#1E293B", // White / Slate 800
                },

                // Custom Colors mapping to legacy
                borderPrimary: mode === "light" ? "#6366F1" : "#FFFFFF",
                dark: { main: mode === "light" ? "#1E293B" : "#F8FAFC" },
                light: { main: mode === "light" ? "#F1F5F9" : "#1E293B" },
                tabHeaderBackground: mode === "light" ? "#F8FAFC" : "#1E293B",
                optionsBackground: mode === "light" ? "#FFFFFF" : "#1E293B",
                options: mode === "light" ? "#fafafa" : "#666",
                fontecor: mode === "light" ? "#6366F1" : "#fff",
                fancyBackground: mode === "light" ? "#F1F5F9" : "#0F172A",
                bordabox: mode === "light" ? "#E2E8F0" : "#334155",
                newmessagebox: mode === "light" ? "#F8FAFC" : "#1E293B",
                inputdigita: mode === "light" ? "#FFFFFF" : "#334155",
                contactdrawer: mode === "light" ? "#FFFFFF" : "#1E293B",
                announcements: mode === "light" ? "#F1F5F9" : "#1E293B",
                login: mode === "light" ? "#FFFFFF" : "#1E293B",
                announcementspopover: mode === "light" ? "#FFFFFF" : "#1E293B",
                chatlist: mode === "light" ? "#F1F5F9" : "#1E293B",
                boxlist: mode === "light" ? "#F1F5F9" : "#1E293B",
                boxchatlist: mode === "light" ? "#F8FAFC" : "#1E293B",
                total: mode === "light" ? "#FFFFFF" : "#1E293B",
                messageIcons: mode === "light" ? "#64748B" : "#F1F5F9",
                inputBackground: mode === "light" ? "#FFFFFF" : "#1E293B",
                barraSuperior: mode === "light" ? "#6366F1" : "#1E293B",
                boxticket: mode === "light" ? "#F1F5F9" : "#1E293B",
                campaigntab: mode === "light" ? "#F1F5F9" : "#1E293B",
                mediainput: mode === "light" ? "#F1F5F9" : "#1E293B",
            },
            typography: {
                fontFamily: [
                    'Inter',
                    'Plus Jakarta Sans',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    '"Segoe UI"',
                    'Roboto',
                    '"Helvetica Neue"',
                    'Arial',
                    'sans-serif',
                    '"Apple Color Emoji"',
                    '"Segoe UI Emoji"',
                    '"Segoe UI Symbol"',
                ].join(','),
                h1: { fontWeight: 700, letterSpacing: '-0.025em' },
                h2: { fontWeight: 700, letterSpacing: '-0.025em' },
                h3: { fontWeight: 600, letterSpacing: '-0.025em' },
                h4: { fontWeight: 600, letterSpacing: '-0.025em' },
                h5: { fontWeight: 500 },
                h6: { fontWeight: 500 },
                button: { fontWeight: 600, textTransform: 'none' },
            },
            shape: {
                borderRadius: 12,
            },
            overrides: {
                MuiButton: {
                    root: {
                        borderRadius: '24px', // Pill shape for buttons
                        padding: '8px 24px',
                    },
                    containedPrimary: {
                        boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4), 0 2px 4px -1px rgba(99, 102, 241, 0.2)', // Soft colored shadow
                        '&:hover': {
                            boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4), 0 4px 6px -2px rgba(99, 102, 241, 0.2)',
                        }
                    }
                },
                MuiPaper: {
                    rounded: {
                        borderRadius: '16px',
                    },
                    elevation1: {
                        boxShadow: mode === "light"
                            ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' // Tailwind shadow-sm
                            : '0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
                    },
                    elevation2: {
                        boxShadow: mode === "light"
                            ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' // Tailwind shadow-md
                            : '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
                    }
                },
                MuiAppBar: {
                    colorPrimary: {
                        backgroundColor: mode === "light" ? "#FFFFFF" : "#1E293B", // White / Dark
                        color: mode === "light" ? "#1E293B" : "#F8FAFC", // Dark text / Light text
                        boxShadow: 'none',
                        borderBottom: `1px solid ${mode === "light" ? "#E2E8F0" : "#334155"}`,
                    }
                },
            },
            mode,
        },
        locale
    );

    useEffect(() => {
        const i18nlocale = localStorage.getItem("i18nextLng");
        const browserLocale = i18nlocale?.substring(0, 2) ?? 'pt';

        if (browserLocale === "pt") {
            setLocale(ptBR);
        } else if (browserLocale === "en") {
            setLocale(enUS)
        } else if (browserLocale === "es")
            setLocale(esES)

    }, []);

    useEffect(() => {
        window.localStorage.setItem("preferredTheme", mode);
    }, [mode]);



    return (
        <ColorModeContext.Provider value={{ colorMode }}>
            <ThemeProvider theme={theme}>
                <QueryClientProvider client={queryClient}>
                    <SocketContext.Provider value={SocketManager}>
                        <Routes />
                    </SocketContext.Provider>
                </QueryClientProvider>
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
};

export default App;
