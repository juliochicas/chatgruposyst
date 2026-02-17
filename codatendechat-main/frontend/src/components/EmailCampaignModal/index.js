import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import {
  makeStyles,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Grid,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Divider,
} from "@material-ui/core";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  sectionTitle: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    fontWeight: 600,
  },
  htmlEditor: {
    fontFamily: "monospace",
    fontSize: 13,
  },
}));

const CampaignSchema = Yup.object().shape({
  name: Yup.string().required("Nombre es requerido"),
  subject: Yup.string().required("Asunto es requerido"),
});

const initialState = {
  name: "",
  subject: "",
  htmlBody: "",
  textBody: "",
  status: "DRAFT",
  useAIVariation: false,
  aiPromptId: "",
  contactListId: "",
  contactSource: "list",
  activeDaysFilter: 30,
  batchSize: 50,
  delayBetweenBatches: 60,
  scheduledAt: "",
};

const EmailCampaignModal = ({ open, onClose, campaignId, onSave }) => {
  const classes = useStyles();
  const [campaign, setCampaign] = useState(initialState);
  const [contactLists, setContactLists] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [emailConfigured, setEmailConfigured] = useState(false);

  useEffect(() => {
    if (open) {
      fetchContactLists();
      fetchPrompts();
      checkEmailConfig();

      if (campaignId) {
        fetchCampaign(campaignId);
      } else {
        setCampaign(initialState);
      }
    }
  }, [open, campaignId]);

  const fetchCampaign = async (id) => {
    try {
      const { data } = await api.get(`/email-campaigns/${id}`);
      setCampaign({
        name: data.name || "",
        subject: data.subject || "",
        htmlBody: data.htmlBody || "",
        textBody: data.textBody || "",
        status: data.status || "DRAFT",
        useAIVariation: data.useAIVariation || false,
        aiPromptId: data.aiPromptId || "",
        contactListId: data.contactListId || "",
        contactSource: data.contactSource || "list",
        activeDaysFilter: data.activeDaysFilter || 30,
        batchSize: data.batchSize || 50,
        delayBetweenBatches: data.delayBetweenBatches || 60,
        scheduledAt: data.scheduledAt
          ? new Date(data.scheduledAt).toISOString().slice(0, 16)
          : "",
      });
    } catch (err) {
      toastError(err);
    }
  };

  const fetchContactLists = async () => {
    try {
      const { data } = await api.get("/contact-lists");
      setContactLists(data);
    } catch (err) {
      // ignore
    }
  };

  const fetchPrompts = async () => {
    try {
      const { data } = await api.get("/prompts");
      setPrompts(data.prompts || []);
    } catch (err) {
      // ignore
    }
  };

  const checkEmailConfig = async () => {
    try {
      const { data } = await api.get("/email-config/status");
      setEmailConfigured(data.configured && data.isActive);
    } catch (err) {
      setEmailConfigured(false);
    }
  };

  const handleSave = async (values) => {
    try {
      const payload = {
        ...values,
        aiPromptId: values.aiPromptId || null,
        contactListId: values.contactSource === "list" ? values.contactListId || null : null,
        scheduledAt: values.scheduledAt || null,
      };

      if (campaignId) {
        await api.put(`/email-campaigns/${campaignId}`, payload);
        toast.success("Campana de email actualizada");
      } else {
        await api.post("/email-campaigns", payload);
        toast.success("Campana de email creada");
      }

      if (onSave) onSave();
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>
        {campaignId ? "Editar Campana de Email" : "Nueva Campana de Email"}
      </DialogTitle>

      <Formik
        initialValues={campaign}
        enableReinitialize
        validationSchema={CampaignSchema}
        onSubmit={(values, actions) => {
          handleSave(values);
          actions.setSubmitting(false);
        }}
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form>
            <DialogContent dividers>
              {!emailConfigured && (
                <Typography
                  variant="body2"
                  style={{
                    color: "#f44336",
                    marginBottom: 16,
                    padding: 8,
                    backgroundColor: "#ffebee",
                    borderRadius: 4,
                  }}
                >
                  No hay configuracion de email activa. Configura Resend primero
                  en Email Config.
                </Typography>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Field
                    as={TextField}
                    label="Nombre de la Campana"
                    name="name"
                    variant="outlined"
                    fullWidth
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field
                    as={TextField}
                    label="Asunto del Email"
                    name="subject"
                    variant="outlined"
                    fullWidth
                    error={touched.subject && Boolean(errors.subject)}
                    helperText={touched.subject && errors.subject}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Field
                    as={TextField}
                    label="Cuerpo del Email (HTML)"
                    name="htmlBody"
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={10}
                    InputProps={{ className: classes.htmlEditor }}
                    helperText="Puedes usar HTML para formatear el email. Usa {nome} para el nombre del contacto."
                  />
                </Grid>

                <Grid item xs={12}>
                  <Field
                    as={TextField}
                    label="Texto Alternativo (opcional)"
                    name="textBody"
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={3}
                    helperText="Texto plano para clientes que no soportan HTML"
                  />
                </Grid>
              </Grid>

              <Divider style={{ margin: "16px 0" }} />

              <Typography variant="subtitle1" className={classes.sectionTitle}>
                Contactos
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Field
                    as={TextField}
                    select
                    label="Fuente de Contactos"
                    name="contactSource"
                    variant="outlined"
                    fullWidth
                  >
                    <MenuItem value="list">Lista de Contactos</MenuItem>
                    <MenuItem value="active">
                      Contactos Activos (con email)
                    </MenuItem>
                  </Field>
                </Grid>

                {values.contactSource === "list" && (
                  <Grid item xs={12} md={6}>
                    <Field
                      as={TextField}
                      select
                      label="Lista de Contactos"
                      name="contactListId"
                      variant="outlined"
                      fullWidth
                    >
                      <MenuItem value="">Seleccionar...</MenuItem>
                      {contactLists.map((list) => (
                        <MenuItem key={list.id} value={list.id}>
                          {list.name}
                        </MenuItem>
                      ))}
                    </Field>
                  </Grid>
                )}

                {values.contactSource === "active" && (
                  <Grid item xs={12} md={6}>
                    <Field
                      as={TextField}
                      label="Dias de Actividad"
                      name="activeDaysFilter"
                      type="number"
                      variant="outlined"
                      fullWidth
                      helperText="Contactos que hablaron en los ultimos N dias"
                    />
                  </Grid>
                )}
              </Grid>

              <Divider style={{ margin: "16px 0" }} />

              <Typography variant="subtitle1" className={classes.sectionTitle}>
                Variacion con IA
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={values.useAIVariation}
                        onChange={(e) =>
                          setFieldValue("useAIVariation", e.target.checked)
                        }
                        color="primary"
                      />
                    }
                    label="Generar variaciones unicas con IA"
                  />
                  <Typography variant="caption" display="block" color="textSecondary">
                    Cada contacto recibira un email unico reescrito por IA
                  </Typography>
                </Grid>

                {values.useAIVariation && (
                  <Grid item xs={12} md={6}>
                    <Field
                      as={TextField}
                      select
                      label="Prompt de IA"
                      name="aiPromptId"
                      variant="outlined"
                      fullWidth
                    >
                      <MenuItem value="">Seleccionar...</MenuItem>
                      {prompts.map((prompt) => (
                        <MenuItem key={prompt.id} value={prompt.id}>
                          {prompt.name}
                        </MenuItem>
                      ))}
                    </Field>
                  </Grid>
                )}
              </Grid>

              <Divider style={{ margin: "16px 0" }} />

              <Typography variant="subtitle1" className={classes.sectionTitle}>
                Opciones de Envio
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Field
                    as={TextField}
                    label="Tamano de Lote"
                    name="batchSize"
                    type="number"
                    variant="outlined"
                    fullWidth
                    helperText="Emails por lote (max 100)"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field
                    as={TextField}
                    label="Delay entre Lotes (seg)"
                    name="delayBetweenBatches"
                    type="number"
                    variant="outlined"
                    fullWidth
                    helperText="Segundos de espera entre lotes"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field
                    as={TextField}
                    label="Programar Envio"
                    name="scheduledAt"
                    type="datetime-local"
                    variant="outlined"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText="Dejar vacio para envio manual"
                  />
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions>
              <Button onClick={onClose} color="secondary">
                Cancelar
              </Button>
              <Button
                type="submit"
                color="primary"
                variant="contained"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <CircularProgress size={24} />
                ) : campaignId ? (
                  "Actualizar"
                ) : (
                  "Crear"
                )}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default EmailCampaignModal;
