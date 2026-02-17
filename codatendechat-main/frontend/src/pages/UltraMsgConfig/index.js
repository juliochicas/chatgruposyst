import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  makeStyles,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Chip,
  Box,
  Divider,
  Card,
  CardContent,
  CardActions,
} from "@material-ui/core";
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  paper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  statusChip: {
    fontWeight: "bold",
    fontSize: 14,
    padding: theme.spacing(1),
  },
  connected: {
    backgroundColor: "#4caf50",
    color: "#fff",
  },
  disconnected: {
    backgroundColor: "#f44336",
    color: "#fff",
  },
  warning: {
    backgroundColor: "#ff9800",
    color: "#fff",
  },
  infoCard: {
    backgroundColor: theme.palette.background.default,
    marginBottom: theme.spacing(2),
  },
  buttonGroup: {
    display: "flex",
    gap: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
}));

const UltraMsgConfig = () => {
  const classes = useStyles();

  const [instanceId, setInstanceId] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("DISCONNECTED");
  const [configId, setConfigId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data } = await api.get("/ultramsg-config");
      if (data && data.length > 0) {
        const config = data[0];
        setInstanceId(config.instanceId);
        setToken(config.token);
        setStatus(config.status);
        setConfigId(config.id);
        setHasConfig(true);
      }
    } catch (err) {
      // No config yet, that's fine
    }
  };

  const handleSave = async () => {
    if (!instanceId || !token) {
      toast.error(i18n.t("ultraMsgConfig.requiresInstanceToken"));
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/ultramsg-config", {
        instanceId,
        token,
      });
      setConfigId(data.id);
      setHasConfig(true);
      toast.success(i18n.t("ultraMsgConfig.configSaved"));
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const { data } = await api.post("/ultramsg-config/test");
      setStatus(data.status);
      if (data.success) {
        toast.success(i18n.t("ultraMsgConfig.connectionSuccess") + data.status);
      } else {
        toast.error(i18n.t("ultraMsgConfig.connectionError") + (data.message || ""));
      }
    } catch (err) {
      toastError(err);
    }
    setTesting(false);
  };

  const handleRefreshStatus = async () => {
    try {
      const { data } = await api.get("/ultramsg-config/status");
      if (data.configured) {
        setStatus(data.isActive ? "CONNECTED" : "DISCONNECTED");
      }
    } catch (err) {
      toastError(err);
    }
  };

  const handleDelete = async () => {
    if (!configId) return;

    try {
      await api.delete(`/ultramsg-config/${configId}`);
      setInstanceId("");
      setToken("");
      setStatus("DISCONNECTED");
      setConfigId(null);
      setHasConfig(false);
      toast.success(i18n.t("ultraMsgConfig.configDeleted"));
    } catch (err) {
      toastError(err);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "CONNECTED":
        return <CheckCircleIcon />;
      case "ERROR":
        return <ErrorIcon />;
      default:
        return <WarningIcon />;
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case "CONNECTED":
        return classes.connected;
      case "ERROR":
        return classes.disconnected;
      default:
        return classes.warning;
    }
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>{i18n.t("ultraMsgConfig.title")}</Title>
      </MainHeader>

      <Paper className={classes.paper} variant="outlined">
        <Typography variant="h6" gutterBottom>
          {i18n.t("ultraMsgConfig.connectionStatus")}
        </Typography>

        <Box display="flex" alignItems="center" mb={2}>
          <Chip
            icon={getStatusIcon()}
            label={status}
            className={`${classes.statusChip} ${getStatusClass()}`}
          />
          <Button
            size="small"
            onClick={handleRefreshStatus}
            style={{ marginLeft: 16 }}
            startIcon={<RefreshIcon />}
          >
            {i18n.t("ultraMsgConfig.refresh")}
          </Button>
        </Box>

        <Divider style={{ marginBottom: 24 }} />

        <Typography variant="h6" gutterBottom>
          {i18n.t("ultraMsgConfig.apiCredentials")}
        </Typography>

        <Card className={classes.infoCard} variant="outlined">
          <CardContent>
            <Typography variant="body2" color="textSecondary" paragraph>
              {i18n.t("ultraMsgConfig.credentialsInfo")}{" "}
              <a
                href="https://ultramsg.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                ultramsg.com
              </a>
              {i18n.t("ultraMsgConfig.credentialsInfoSuffix")}
            </Typography>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Instance ID"
              variant="outlined"
              fullWidth
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              placeholder={i18n.t("ultraMsgConfig.instanceIdPlaceholder")}
              helperText={i18n.t("ultraMsgConfig.instanceIdHelperText")}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Token"
              variant="outlined"
              fullWidth
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={i18n.t("ultraMsgConfig.tokenPlaceholder")}
              type="password"
              helperText={i18n.t("ultraMsgConfig.tokenHelperText")}
            />
          </Grid>
        </Grid>

        <div className={classes.buttonGroup}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={loading || !instanceId || !token}
            startIcon={
              loading ? <CircularProgress size={20} /> : <SaveIcon />
            }
          >
            {hasConfig ? i18n.t("ultraMsgConfig.update") : i18n.t("ultraMsgConfig.save")}
          </Button>

          {hasConfig && (
            <Button
              variant="contained"
              style={{ backgroundColor: "#4caf50", color: "#fff" }}
              onClick={handleTestConnection}
              disabled={testing}
              startIcon={
                testing ? (
                  <CircularProgress size={20} />
                ) : (
                  <SendIcon />
                )
              }
            >
              {i18n.t("ultraMsgConfig.testConnection")}
            </Button>
          )}

          {hasConfig && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleDelete}
            >
              {i18n.t("ultraMsgConfig.deleteConfig")}
            </Button>
          )}
        </div>
      </Paper>

      <Paper className={classes.paper} variant="outlined">
        <Typography variant="h6" gutterBottom>
          {i18n.t("ultraMsgConfig.howItWorks")}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  {i18n.t("ultraMsgConfig.step1Title")}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {i18n.t("ultraMsgConfig.step1Description")}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  {i18n.t("ultraMsgConfig.step2Title")}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {i18n.t("ultraMsgConfig.step2Description")}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  {i18n.t("ultraMsgConfig.step3Title")}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {i18n.t("ultraMsgConfig.step3Description")}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </MainContainer>
  );
};

export default UltraMsgConfig;
