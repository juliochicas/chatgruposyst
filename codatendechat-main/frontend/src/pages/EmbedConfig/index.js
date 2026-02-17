import React, { useState, useEffect } from "react";
import {
  makeStyles,
  Paper,
  Button,
  TextField,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  Tooltip,
} from "@material-ui/core";
import {
  FileCopy as CopyIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  Visibility as PreviewIcon,
} from "@material-ui/icons";
import { toast } from "react-toastify";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(3),
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  section: {
    marginBottom: theme.spacing(3),
  },
  sectionTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(1),
  },
  codeBlock: {
    backgroundColor: "#1e1e1e",
    color: "#d4d4d4",
    padding: theme.spacing(2),
    borderRadius: 8,
    fontFamily: "monospace",
    fontSize: "0.8rem",
    overflowX: "auto",
    position: "relative",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
  copyButton: {
    position: "absolute",
    top: 8,
    right: 8,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.1)",
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.2)",
    },
  },
  previewFrame: {
    width: "100%",
    height: 500,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 4,
    border: `1px solid ${theme.palette.divider}`,
    display: "inline-block",
    verticalAlign: "middle",
    marginLeft: theme.spacing(1),
  },
  tokenField: {
    fontFamily: "monospace",
    fontSize: "0.75rem",
  },
}));

const EmbedConfigPage = () => {
  const classes = useStyles();
  const [config, setConfig] = useState(null);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  // Settings form
  const [allowedDomains, setAllowedDomains] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2196f3");
  const [title, setTitle] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/embed-config");
      if (data.configured) {
        setConfigured(true);
        setConfig(data.config);
        setAllowedDomains(data.config.allowedDomains || "");
        setPrimaryColor(data.config.primaryColor || "#2196f3");
        setTitle(data.config.title || "");
        setWelcomeMessage(data.config.welcomeMessage || "");
        setIsActive(data.config.isActive);
      }
    } catch (e) {
      toastError(e);
    }
    setLoading(false);
  };

  const handleGenerateToken = async () => {
    try {
      const { data } = await api.post("/embed-config", {
        allowedDomains,
        primaryColor,
        title,
        welcomeMessage,
      });
      setConfig(data.config);
      setConfigured(true);
      toast.success(i18n.t("embedConfig.toasts.tokenGenerated"));
    } catch (e) {
      toastError(e);
    }
  };

  const handleUpdateConfig = async () => {
    try {
      const { data } = await api.put("/embed-config", {
        allowedDomains,
        primaryColor,
        title,
        welcomeMessage,
        isActive,
      });
      setConfig(data.config);
      toast.success(i18n.t("embedConfig.toasts.configUpdated"));
    } catch (e) {
      toastError(e);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(i18n.t("embedConfig.toasts.copied"));
  };

  const getEmbedUrl = () => {
    if (!config) return "";
    const frontendUrl = window.location.origin;
    return `${frontendUrl}/embed?token=${config.embedToken}`;
  };

  const getIframeCode = () => {
    const url = getEmbedUrl();
    return `<iframe\n  src="${url}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  allow="clipboard-write"\n  style="border: none; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);"\n></iframe>`;
  };

  const getScriptCode = () => {
    const url = getEmbedUrl();
    return `<script>
(function() {
  var btn = document.createElement('div');
  btn.innerHTML = '<div style="position:fixed;bottom:20px;right:20px;z-index:9999;cursor:pointer;" id="chateaya-widget-btn">' +
    '<div style="width:60px;height:60px;border-radius:50%;background:${primaryColor};display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);">' +
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>' +
    '</div></div>';
  document.body.appendChild(btn);

  var frame = document.createElement('div');
  frame.innerHTML = '<div id="chateaya-widget-frame" style="display:none;position:fixed;bottom:90px;right:20px;width:400px;height:600px;z-index:9998;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.2);">' +
    '<iframe src="${url}" width="100%" height="100%" frameborder="0" allow="clipboard-write" style="border:none;"></iframe>' +
    '</div>';
  document.body.appendChild(frame);

  document.getElementById('chateaya-widget-btn').onclick = function() {
    var f = document.getElementById('chateaya-widget-frame');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
  };
})();
</script>`;
  };

  if (loading) {
    return (
      <MainContainer>
        <MainHeader>
          <Title>{i18n.t("embedConfig.title")}</Title>
        </MainHeader>
        <Paper className={classes.mainPaper} variant="outlined">
          <Typography>{i18n.t("embedConfig.loading")}</Typography>
        </Paper>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <MainHeader>
        <Title>{i18n.t("embedConfig.title")}</Title>
        <MainHeaderButtonsWrapper>
          {configured && (
            <Button
              variant="outlined"
              onClick={() => setShowPreview(!showPreview)}
              startIcon={<PreviewIcon />}
            >
              {showPreview
                ? i18n.t("embedConfig.buttons.hidePreview")
                : i18n.t("embedConfig.buttons.preview")}
            </Button>
          )}
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper className={classes.mainPaper} variant="outlined">
        {/* Configuration Section */}
        <div className={classes.section}>
          <Typography variant="h6" className={classes.sectionTitle}>
            {i18n.t("embedConfig.sections.settings")}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label={i18n.t("embedConfig.fields.title")}
                fullWidth
                variant="outlined"
                size="small"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                helperText={i18n.t("embedConfig.fields.titleHelp")}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={i18n.t("embedConfig.fields.welcomeMessage")}
                fullWidth
                variant="outlined"
                size="small"
                multiline
                rows={2}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                helperText={i18n.t("embedConfig.fields.welcomeMessageHelp")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={i18n.t("embedConfig.fields.allowedDomains")}
                fullWidth
                variant="outlined"
                size="small"
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
                helperText={i18n.t("embedConfig.fields.allowedDomainsHelp")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <TextField
                  label={i18n.t("embedConfig.fields.primaryColor")}
                  variant="outlined"
                  size="small"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{
                    width: 40,
                    height: 40,
                    border: "none",
                    cursor: "pointer",
                    marginLeft: 8,
                  }}
                />
              </div>
            </Grid>
            {configured && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={i18n.t("embedConfig.fields.active")}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              {configured ? (
                <div style={{ display: "flex", gap: 12 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleUpdateConfig}
                  >
                    {i18n.t("embedConfig.buttons.save")}
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleGenerateToken}
                    startIcon={<RefreshIcon />}
                  >
                    {i18n.t("embedConfig.buttons.regenerate")}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleGenerateToken}
                  startIcon={<CodeIcon />}
                >
                  {i18n.t("embedConfig.buttons.generate")}
                </Button>
              )}
            </Grid>
          </Grid>
        </div>

        {configured && config && (
          <>
            <Divider style={{ margin: "16px 0" }} />

            {/* Embed Token */}
            <div className={classes.section}>
              <Typography variant="h6" className={classes.sectionTitle}>
                {i18n.t("embedConfig.sections.token")}
              </Typography>
              <div style={{ position: "relative" }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  value={config.embedToken}
                  InputProps={{
                    readOnly: true,
                    className: classes.tokenField,
                  }}
                />
                <Tooltip title={i18n.t("embedConfig.buttons.copy")}>
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(config.embedToken)}
                    style={{ position: "absolute", right: 8, top: 6 }}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
            </div>

            <Divider style={{ margin: "16px 0" }} />

            {/* iFrame Code */}
            <div className={classes.section}>
              <Typography variant="h6" className={classes.sectionTitle}>
                {i18n.t("embedConfig.sections.iframeCode")}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {i18n.t("embedConfig.sections.iframeDescription")}
              </Typography>
              <div className={classes.codeBlock}>
                <Tooltip title={i18n.t("embedConfig.buttons.copy")}>
                  <IconButton
                    className={classes.copyButton}
                    size="small"
                    onClick={() => handleCopy(getIframeCode())}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {getIframeCode()}
              </div>
            </div>

            <Divider style={{ margin: "16px 0" }} />

            {/* Widget Script */}
            <div className={classes.section}>
              <Typography variant="h6" className={classes.sectionTitle}>
                {i18n.t("embedConfig.sections.widgetCode")}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {i18n.t("embedConfig.sections.widgetDescription")}
              </Typography>
              <div className={classes.codeBlock}>
                <Tooltip title={i18n.t("embedConfig.buttons.copy")}>
                  <IconButton
                    className={classes.copyButton}
                    size="small"
                    onClick={() => handleCopy(getScriptCode())}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {getScriptCode()}
              </div>
            </div>

            {/* Preview */}
            {showPreview && (
              <>
                <Divider style={{ margin: "16px 0" }} />
                <div className={classes.section}>
                  <Typography variant="h6" className={classes.sectionTitle}>
                    {i18n.t("embedConfig.sections.preview")}
                  </Typography>
                  <iframe
                    src={getEmbedUrl()}
                    className={classes.previewFrame}
                    title="Embed Preview"
                  />
                </div>
              </>
            )}
          </>
        )}
      </Paper>
    </MainContainer>
  );
};

export default EmbedConfigPage;
