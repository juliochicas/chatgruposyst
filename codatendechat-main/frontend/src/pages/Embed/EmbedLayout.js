import React from "react";
import { makeStyles, ThemeProvider, createTheme, CssBaseline } from "@material-ui/core";

const useStyles = makeStyles(() => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100%",
    overflow: "hidden",
  },
}));

const EmbedLayout = ({ children, primaryColor = "#2196f3" }) => {
  const classes = useStyles();

  const theme = createTheme({
    palette: {
      primary: { main: primaryColor },
    },
    overrides: {
      MuiCssBaseline: {
        "@global": {
          body: {
            margin: 0,
            padding: 0,
            overflow: "hidden",
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className={classes.root}>{children}</div>
    </ThemeProvider>
  );
};

export default EmbedLayout;
