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
} from "@material-ui/core";
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Email as EmailIcon,
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
  testEmailSection: {
    marginTop: theme.spacing(3),
    paddingTop: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
}));

const EmailConfig = () => {
  const classes = useStyles();

  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [configId, setConfigId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [domains, setDomains] = useState([]);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data } = await api.get("/email-config");
      if (data && data.length > 0) {
        const config = data[0];
        setApiKey(config.apiKey);
        setFromEmail(config.fromEmail);
        setFromName(config.fromName);
        setReplyTo(config.replyTo || "");
        setIsActive(config.isActive);
        setConfigId(config.id);
        setHasConfig(true);
      }
    } catch (err) {
      // No config yet
    }
  };

  const handleSave = async () => {
    if (!apiKey || !fromEmail || !fromName) {
      toast.error("API Key, email remitente y nombre son requeridos");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/email-config", {
        apiKey,
        fromEmail,
        fromName,
        replyTo,
      });
      setConfigId(data.id);
      setHasConfig(true);
      toast.success("Configuracion de email guardada correctamente");
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const { data } = await api.post("/email-config/test");
      if (data.success) {
        setIsActive(true);
        setDomains(data.domains || []);
        toast.success("Conexion exitosa con Resend");
      } else {
        setIsActive(false);
        toast.error("Error: " + (data.message || "No se pudo conectar"));
      }
    } catch (err) {
      toastError(err);
    }
    setTesting(false);
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Ingresa un email de prueba");
      return;
    }
    setSendingTest(true);
    try {
      const { data } = await api.post("/email-config/send-test", {
        testEmail,
      });
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error("Error: " + data.message);
      }
    } catch (err) {
      toastError(err);
    }
    setSendingTest(false);
  };

  const handleRefreshStatus = async () => {
    try {
      const { data } = await api.get("/email-config/status");
      if (data.configured) {
        setIsActive(data.isActive);
      }
    } catch (err) {
      toastError(err);
    }
  };

  const handleDelete = async () => {
    if (!configId) return;
    try {
      await api.delete(`/email-config/${configId}`);
      setApiKey("");
      setFromEmail("");
      setFromName("");
      setReplyTo("");
      setIsActive(false);
      setConfigId(null);
      setHasConfig(false);
      setDomains([]);
      toast.success("Configuracion eliminada");
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>Configuracion Email - Resend API</Title>
      </MainHeader>

      <Paper className={classes.paper} variant="outlined">
        <Typography variant="h6" gutterBottom>
          Estado de la Conexion
        </Typography>

        <Box display="flex" alignItems="center" mb={2}>
          <Chip
            icon={isActive ? <CheckCircleIcon /> : <WarningIcon />}
            label={isActive ? "ACTIVO" : "INACTIVO"}
            className={`${classes.statusChip} ${
              isActive ? classes.connected : classes.warning
            }`}
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

        {domains.length > 0 && (
          <Box mb={2}>
            <Typography variant="body2" color="textSecondary">
              Dominios verificados:{" "}
              {domains.map((d) => d.name || d.id).join(", ")}
            </Typography>
          </Box>
        )}

        <Divider style={{ marginBottom: 24 }} />

        <Typography variant="h6" gutterBottom>
          Credenciales de Resend
        </Typography>

        <Card className={classes.infoCard} variant="outlined">
          <CardContent>
            <Typography variant="body2" color="textSecondary" paragraph>
              Para obtener tu API Key, registrate en{" "}
              <a
                href="https://resend.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                resend.com
              </a>
              . Crea una API Key en Settings &gt; API Keys. Verifica tu dominio
              para enviar desde tu propia direccion de email.
            </Typography>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="API Key"
              variant="outlined"
              fullWidth
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="re_xxxxxxxxx..."
              type="password"
              helperText="Tu API Key de Resend"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Email Remitente"
              variant="outlined"
              fullWidth
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="noreply@tudominio.com"
              helperText="Email desde el que se enviaran los correos"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Nombre Remitente"
              variant="outlined"
              fullWidth
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Mi Empresa"
              helperText="Nombre que aparece como remitente"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Reply-To (Opcional)"
              variant="outlined"
              fullWidth
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="soporte@tudominio.com"
              helperText="Email al que responderan los destinatarios"
            />
          </Grid>
        </Grid>

        <div className={classes.buttonGroup}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={loading || !apiKey || !fromEmail || !fromName}
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
                testing ? <CircularProgress size={20} /> : <SendIcon />
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
              Eliminar
            </Button>
          )}
        </div>

        {hasConfig && isActive && (
          <div className={classes.testEmailSection}>
            <Typography variant="h6" gutterBottom>
              Enviar Email de Prueba
            </Typography>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email de prueba"
                  variant="outlined"
                  fullWidth
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@ejemplo.com"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSendTestEmail}
                  disabled={sendingTest || !testEmail}
                  startIcon={
                    sendingTest ? (
                      <CircularProgress size={20} />
                    ) : (
                      <EmailIcon />
                    )
                  }
                  fullWidth
                >
                  Enviar Prueba
                </Button>
              </Grid>
            </Grid>
          </div>
        )}
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
                  1. Configurar Resend
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Ingresa tu API Key de Resend y configura el email remitente.
                  Prueba la conexion para verificar que funcione.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  2. Crear Campana de Email
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Crea campanas con asunto y cuerpo HTML. Selecciona una lista
                  de contactos y activa la variacion con IA para emails unicos.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  3. Envio Inteligente
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Los emails se envian en lotes con delays automaticos. La IA
                  genera variaciones unicas para cada contacto, evitando filtros
                  de spam.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </MainContainer>
  );
};

export default EmailConfig;
