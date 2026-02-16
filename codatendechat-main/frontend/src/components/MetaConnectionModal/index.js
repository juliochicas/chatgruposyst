import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  DialogActions,
  CircularProgress,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@material-ui/core";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  multFieldLine: {
    display: "flex",
    "& > *:not(:last-child)": {
      marginRight: theme.spacing(1),
    },
  },
  btnWrapper: {
    position: "relative",
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  channelChip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 12px",
    borderRadius: 16,
    fontSize: 13,
    fontWeight: 500,
    marginRight: 8,
    cursor: "pointer",
    border: "2px solid transparent",
  },
  channelFacebook: {
    backgroundColor: "#e7f3ff",
    color: "#1877F2",
    "&.selected": {
      borderColor: "#1877F2",
    },
  },
  channelInstagram: {
    background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
    color: "#fff",
    "&.selected": {
      borderColor: "#dc2743",
    },
  },
  channelThreads: {
    backgroundColor: "#000",
    color: "#fff",
    "&.selected": {
      borderColor: "#000",
      boxShadow: "0 0 0 1px #000",
    },
  },
}));

const MetaSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Nombre muy corto")
    .max(50, "Nombre muy largo")
    .required("Nombre obligatorio"),
});

const MetaConnectionModal = ({ open, onClose, metaConnectionId }) => {
  const classes = useStyles();
  const initialState = {
    name: "",
    channel: "facebook",
    greetingMessage: "",
    complationMessage: "",
    outOfHoursMessage: "",
    ratingMessage: "",
    isDefault: false,
    expiresInactiveMessage: "",
    expiresTicket: 0,
    maxUseBotQueues: 3,
  };

  const [metaConnection, setMetaConnection] = useState(initialState);
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);
  const [selectedQueueId, setSelectedQueueId] = useState(null);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState("facebook");

  useEffect(() => {
    const fetchConnection = async () => {
      if (!metaConnectionId) return;
      try {
        const { data } = await api.get(`/meta-connections/${metaConnectionId}`);
        setMetaConnection(data);
        setSelectedPrompt(data.promptId);
        setSelectedIntegration(data.integrationId);
        setSelectedChannel(data.channel || "facebook");
        const queueIds = data.queues?.map((queue) => queue.id) || [];
        setSelectedQueueIds(queueIds);
        setSelectedQueueId(data.transferQueueId);
      } catch (err) {
        toastError(err);
      }
    };
    fetchConnection();
  }, [metaConnectionId]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/prompt");
        setPrompts(data.prompts);
        const { data: dataIntegration } = await api.get("/queueIntegration");
        setIntegrations(dataIntegration.queueIntegrations);
      } catch (err) {
        toastError(err);
      }
    })();
  }, [metaConnectionId]);

  const handleSave = async (values) => {
    const connectionData = {
      ...values,
      channel: selectedChannel,
      queueIds: selectedQueueIds,
      transferQueueId: selectedQueueId,
      promptId: selectedPrompt || null,
      integrationId: selectedIntegration,
    };
    delete connectionData["queues"];

    try {
      if (metaConnectionId) {
        await api.put(`/meta-connections/${metaConnectionId}`, connectionData);
      } else {
        await api.post("/meta-connections", connectionData);
      }
      toast.success("Conexion Meta guardada con exito.");
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  const handleChangeQueue = (e) => {
    setSelectedQueueIds(e);
    setSelectedPrompt(null);
  };

  const handleChangePrompt = (e) => {
    setSelectedPrompt(e.target.value);
    setSelectedQueueIds([]);
  };

  const handleChangeIntegration = (e) => {
    setSelectedIntegration(e.target.value);
  };

  const handleClose = () => {
    onClose();
    setMetaConnection(initialState);
    setSelectedQueueId(null);
    setSelectedQueueIds([]);
    setSelectedChannel("facebook");
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          {metaConnectionId
            ? "Editar Conexion Meta"
            : "Agregar Conexion Facebook / Instagram / Threads"}
        </DialogTitle>
        <Formik
          initialValues={metaConnection}
          enableReinitialize={true}
          validationSchema={MetaSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSave(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ values, touched, errors, isSubmitting }) => (
            <Form>
              <DialogContent dividers>
                {/* Channel selection */}
                {!metaConnectionId && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ marginBottom: 8, fontWeight: 500 }}>
                      Canal:
                    </p>
                    <span
                      className={`${classes.channelChip} ${classes.channelFacebook} ${selectedChannel === "facebook" ? "selected" : ""}`}
                      onClick={() => setSelectedChannel("facebook")}
                    >
                      Facebook Messenger
                    </span>
                    <span
                      className={`${classes.channelChip} ${classes.channelInstagram} ${selectedChannel === "instagram" ? "selected" : ""}`}
                      onClick={() => setSelectedChannel("instagram")}
                    >
                      Instagram
                    </span>
                    <span
                      className={`${classes.channelChip} ${classes.channelThreads} ${selectedChannel === "threads" ? "selected" : ""}`}
                      onClick={() => setSelectedChannel("threads")}
                    >
                      Threads
                    </span>
                  </div>
                )}

                <div className={classes.multFieldLine}>
                  <Grid spacing={2} container>
                    <Grid item>
                      <Field
                        as={TextField}
                        label="Nombre"
                        autoFocus
                        name="name"
                        error={touched.name && Boolean(errors.name)}
                        helperText={touched.name && errors.name}
                        variant="outlined"
                        margin="dense"
                      />
                    </Grid>
                    <Grid style={{ paddingTop: 15 }} item>
                      <FormControlLabel
                        control={
                          <Field
                            as={Switch}
                            color="primary"
                            name="isDefault"
                            checked={values.isDefault}
                          />
                        }
                        label="Predeterminado"
                      />
                    </Grid>
                  </Grid>
                </div>

                <div>
                  <Field
                    as={TextField}
                    label="Mensaje de bienvenida"
                    multiline
                    rows={3}
                    fullWidth
                    name="greetingMessage"
                    variant="outlined"
                    margin="dense"
                  />
                </div>
                <div>
                  <Field
                    as={TextField}
                    label="Mensaje de conclusion"
                    multiline
                    rows={3}
                    fullWidth
                    name="complationMessage"
                    variant="outlined"
                    margin="dense"
                  />
                </div>
                <div>
                  <Field
                    as={TextField}
                    label="Mensaje fuera de horario"
                    multiline
                    rows={3}
                    fullWidth
                    name="outOfHoursMessage"
                    variant="outlined"
                    margin="dense"
                  />
                </div>
                <div>
                  <Field
                    as={TextField}
                    label="Mensaje de calificacion"
                    multiline
                    rows={3}
                    fullWidth
                    name="ratingMessage"
                    variant="outlined"
                    margin="dense"
                  />
                </div>

                <QueueSelect
                  selectedQueueIds={selectedQueueIds}
                  onChange={(selectedIds) => handleChangeQueue(selectedIds)}
                />
                <FormControl margin="dense" variant="outlined" fullWidth>
                  <InputLabel>Prompt</InputLabel>
                  <Select
                    name="promptId"
                    value={selectedPrompt || ""}
                    onChange={handleChangePrompt}
                    label="Prompt"
                    fullWidth
                    MenuProps={{
                      anchorOrigin: { vertical: "bottom", horizontal: "left" },
                      transformOrigin: { vertical: "top", horizontal: "left" },
                      getContentAnchorEl: null,
                    }}
                  >
                    {prompts.map((prompt) => (
                      <MenuItem key={prompt.id} value={prompt.id}>
                        {prompt.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl margin="dense" variant="outlined" fullWidth>
                  <InputLabel>Integracion</InputLabel>
                  <Select
                    name="integrationId"
                    value={selectedIntegration || ""}
                    onChange={handleChangeIntegration}
                    label="Integracion"
                    fullWidth
                    MenuProps={{
                      anchorOrigin: { vertical: "bottom", horizontal: "left" },
                      transformOrigin: { vertical: "top", horizontal: "left" },
                      getContentAnchorEl: null,
                    }}
                  >
                    {integrations.map((integ) => (
                      <MenuItem key={integ.id} value={integ.id}>
                        {integ.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <div>
                  <h3>Redireccion de Cola</h3>
                  <p>Seleccione una cola para redirigir contactos sin cola asignada</p>
                  <Grid container spacing={2}>
                    <Grid item sm={6}>
                      <Field
                        fullWidth
                        type="number"
                        as={TextField}
                        label="Transferir despues de x (minutos)"
                        name="timeToTransfer"
                        variant="outlined"
                        margin="dense"
                      />
                    </Grid>
                    <Grid item sm={6}>
                      <QueueSelect
                        selectedQueueIds={selectedQueueId}
                        onChange={(selectedId) => setSelectedQueueId(selectedId)}
                        multiple={false}
                        title="Cola de Transferencia"
                      />
                    </Grid>
                  </Grid>
                  <Grid spacing={2} container>
                    <Grid xs={12} md={12} item>
                      <Field
                        as={TextField}
                        label="Cerrar chats abiertos despues de x minutos"
                        fullWidth
                        name="expiresTicket"
                        variant="outlined"
                        margin="dense"
                      />
                    </Grid>
                  </Grid>
                  <div>
                    <Field
                      as={TextField}
                      label="Mensaje de cierre por inactividad"
                      multiline
                      rows={3}
                      fullWidth
                      name="expiresInactiveMessage"
                      variant="outlined"
                      margin="dense"
                    />
                  </div>
                </div>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting}
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {metaConnectionId ? "Guardar" : "Agregar"}
                  {isSubmitting && (
                    <CircularProgress
                      size={24}
                      className={classes.buttonProgress}
                    />
                  )}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default React.memo(MetaConnectionModal);
