import React, { useState, useEffect, useCallback } from "react";
import {
  makeStyles,
  AppBar,
  Toolbar,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  IconButton,
} from "@material-ui/core";
import { ExitToApp as LogoutIcon } from "@material-ui/icons";
import { openApi } from "../../services/api";
import EmbedLayout from "./EmbedLayout";
import EmbedChat from "./EmbedChat";

const useStyles = makeStyles((theme) => ({
  loginContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    padding: theme.spacing(3),
  },
  loginPaper: {
    padding: theme.spacing(4),
    maxWidth: 400,
    width: "100%",
    textAlign: "center",
  },
  loginForm: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  welcomeText: {
    marginBottom: theme.spacing(2),
    color: theme.palette.text.secondary,
  },
  appBar: {
    position: "relative",
  },
  toolbarTitle: {
    flexGrow: 1,
  },
  mainContent: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
  },
}));

const EmbedPage = () => {
  const classes = useStyles();

  const [embedToken, setEmbedToken] = useState("");
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Auth state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Extract embed token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setEmbedToken(t);
    } else {
      setError("Token de embed no proporcionado en la URL.");
      setLoading(false);
    }
  }, []);

  // Load embed config
  useEffect(() => {
    if (!embedToken) return;

    const loadConfig = async () => {
      try {
        const { data } = await openApi.get("/embed/config", {
          headers: { "X-Embed-Token": embedToken },
        });
        setConfig(data);

        // Check if we have a saved session
        const savedToken = sessionStorage.getItem(`embed_token_${data.companyId}`);
        const savedUser = sessionStorage.getItem(`embed_user_${data.companyId}`);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        const msg =
          e.response?.data?.error || "Error al cargar configuración del embed.";
        setError(msg);
      }
      setLoading(false);
    };

    loadConfig();
  }, [embedToken]);

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLoginError("Ingresa tu email y contraseña.");
      return;
    }
    setLoginLoading(true);
    setLoginError("");

    try {
      const { data } = await openApi.post(
        "/embed/login",
        { email, password },
        { headers: { "X-Embed-Token": embedToken } }
      );
      setToken(data.token);
      setUser(data.user);
      // Save session
      sessionStorage.setItem(`embed_token_${config.companyId}`, data.token);
      sessionStorage.setItem(
        `embed_user_${config.companyId}`,
        JSON.stringify(data.user)
      );
    } catch (err) {
      const msg = err.response?.data?.error || "Error al iniciar sesión.";
      setLoginError(msg);
    }
    setLoginLoading(false);
  }, [email, password, embedToken, config]);

  const handleLogout = () => {
    setUser(null);
    setToken("");
    if (config) {
      sessionStorage.removeItem(`embed_token_${config.companyId}`);
      sessionStorage.removeItem(`embed_user_${config.companyId}`);
    }
  };

  if (loading) {
    return (
      <EmbedLayout>
        <div className={classes.loadingContainer}>
          <CircularProgress />
        </div>
      </EmbedLayout>
    );
  }

  if (error) {
    return (
      <EmbedLayout>
        <div className={classes.loginContainer}>
          <Paper className={classes.loginPaper}>
            <Typography variant="h6" color="error">
              Error
            </Typography>
            <Typography>{error}</Typography>
          </Paper>
        </div>
      </EmbedLayout>
    );
  }

  const primaryColor = config?.primaryColor || "#2196f3";

  // Show login if not authenticated
  if (!user || !token) {
    return (
      <EmbedLayout primaryColor={primaryColor}>
        <div className={classes.loginContainer}>
          <Paper className={classes.loginPaper} elevation={3}>
            <Typography variant="h5" gutterBottom>
              {config?.title || config?.companyName || "ChateaYA"}
            </Typography>
            {config?.welcomeMessage && (
              <Typography className={classes.welcomeText}>
                {config.welcomeMessage}
              </Typography>
            )}
            <form className={classes.loginForm} onSubmit={handleLogin}>
              <TextField
                label="Correo electrónico"
                variant="outlined"
                size="small"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <TextField
                label="Contraseña"
                type="password"
                variant="outlined"
                size="small"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {loginError && (
                <Typography color="error" variant="body2">
                  {loginError}
                </Typography>
              )}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={loginLoading}
              >
                {loginLoading ? <CircularProgress size={24} /> : "Iniciar Sesión"}
              </Button>
            </form>
          </Paper>
        </div>
      </EmbedLayout>
    );
  }

  // Authenticated - show the main chat interface
  return (
    <EmbedLayout primaryColor={primaryColor}>
      <AppBar className={classes.appBar} color="primary">
        <Toolbar variant="dense">
          <Typography variant="h6" className={classes.toolbarTitle}>
            {config?.title || config?.companyName || "ChateaYA"}
          </Typography>
          <Typography variant="body2" style={{ marginRight: 8 }}>
            {user.name}
          </Typography>
          <IconButton color="inherit" size="small" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <div className={classes.mainContent}>
        <EmbedChat user={user} token={token} embedToken={embedToken} />
      </div>
    </EmbedLayout>
  );
};

export default EmbedPage;
