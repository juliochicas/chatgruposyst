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
      toast.error("Instance ID y Token son requeridos");
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
      toast.success("Configuracion guardada correctamente");
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
        toast.success("Conexion exitosa - Estado: " + data.status);
      } else {
        toast.error("Error de conexion: " + (data.message || "No se pudo conectar"));
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
      toast.success("Configuracion eliminada");
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
        <Title>Configuracion UltraMsg - WhatsApp API</Title>
      </MainHeader>

      <Paper className={classes.paper} variant="outlined">
        <Typography variant="h6" gutterBottom>
          Estado de la Conexion
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
            Actualizar
          </Button>
        </Box>

        <Divider style={{ marginBottom: 24 }} />

        <Typography variant="h6" gutterBottom>
          Credenciales de API
        </Typography>

        <Card className={classes.infoCard} variant="outlined">
          <CardContent>
            <Typography variant="body2" color="textSecondary" paragraph>
              Para obtener tu Instance ID y Token, registrate en{" "}
              <a
                href="https://ultramsg.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                ultramsg.com
              </a>
              . Luego de crear una instancia, escanea el codigo QR con tu
              WhatsApp y copia las credenciales aqui.
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
              placeholder="Ej: instance12345"
              helperText="ID de tu instancia en UltraMsg"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Token"
              variant="outlined"
              fullWidth
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Ej: abc123xyz..."
              type="password"
              helperText="Token de autenticacion de la API"
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
            {hasConfig ? "Actualizar" : "Guardar"}
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
              Probar Conexion
            </Button>
          )}

          {hasConfig && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleDelete}
            >
              Eliminar Configuracion
            </Button>
          )}
        </div>
      </Paper>

      <Paper className={classes.paper} variant="outlined">
        <Typography variant="h6" gutterBottom>
          Como Funciona
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  1. Configurar
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Ingresa tu Instance ID y Token de UltraMsg. Prueba la conexion
                  para verificar que todo funcione correctamente.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  2. Crear Campana
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Al crear una campana, selecciona "UltraMsg" como canal de
                  envio. Activa la variacion con IA para evitar baneos.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  3. Anti-Ban
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  El sistema envia mensajes con delays aleatorios, pausas
                  automaticas y variaciones de IA para cada contacto,
                  minimizando el riesgo de baneo.
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
