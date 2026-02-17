import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";
import {
  makeStyles,
  Paper,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Typography,
  Chip,
  Box,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  LinearProgress,
} from "@material-ui/core";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Assessment as ReportIcon,
  Search as SearchIcon,
  Email as EmailIcon,
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import ConfirmationModal from "../../components/ConfirmationModal";
import EmailCampaignModal from "../../components/EmailCampaignModal";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { SocketContext } from "../../context/Socket/SocketContext";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  statusChip: {
    fontWeight: "bold",
  },
  reportCard: {
    padding: theme.spacing(2),
    textAlign: "center",
  },
  reportValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.palette.primary.main,
  },
}));

const statusColors = {
  DRAFT: "default",
  SCHEDULED: "primary",
  SENDING: "secondary",
  PAUSED: "default",
  COMPLETED: "primary",
  CANCELLED: "default",
};

const statusLabels = {
  DRAFT: "Borrador",
  SCHEDULED: "Programada",
  SENDING: "Enviando",
  PAUSED: "Pausada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

const reducer = (state, action) => {
  if (action.type === "LOAD_CAMPAIGNS") {
    return action.payload;
  }
  if (action.type === "UPDATE_CAMPAIGN") {
    const index = state.findIndex((c) => c.id === action.payload.id);
    if (index !== -1) {
      state[index] = action.payload;
      return [...state];
    }
    return [action.payload, ...state];
  }
  if (action.type === "DELETE_CAMPAIGN") {
    return state.filter((c) => c.id !== action.payload);
  }
  return state;
};

const EmailCampaigns = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const socketManager = useContext(SocketContext);

  const [campaigns, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchCampaigns();
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.getSocket(companyId);

    socket.on(`company-${companyId}-email-campaign`, (data) => {
      if (data.action === "create" || data.action === "update") {
        dispatch({ type: "UPDATE_CAMPAIGN", payload: data.record });
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_CAMPAIGN", payload: data.id });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [socketManager]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/email-campaigns", {
        params: { searchParam, pageNumber },
      });
      dispatch({ type: "LOAD_CAMPAIGNS", payload: data.records });
      setHasMore(data.hasMore);
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
  };

  const handleOpenModal = (id = null) => {
    setSelectedCampaignId(id);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedCampaignId(null);
    setModalOpen(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/email-campaigns/${deletingId}`);
      toast.success("Campana eliminada");
      fetchCampaigns();
    } catch (err) {
      toastError(err);
    }
    setDeletingId(null);
    setConfirmDelete(false);
  };

  const handleStart = async (id) => {
    try {
      const { data } = await api.post(`/email-campaigns/${id}/start`);
      toast.success(`${data.message} (${data.contactCount} contactos)`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleCancel = async (id) => {
    try {
      await api.post(`/email-campaigns/${id}/cancel`);
      toast.success("Campana cancelada");
    } catch (err) {
      toastError(err);
    }
  };

  const handleViewReport = async (id) => {
    try {
      const { data } = await api.get(`/email-campaigns/${id}/report`);
      setReportData(data);
      setReportOpen(true);
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <MainContainer>
      <EmailCampaignModal
        open={modalOpen}
        onClose={handleCloseModal}
        campaignId={selectedCampaignId}
        onSave={fetchCampaigns}
      />

      <ConfirmationModal
        title="Eliminar Campana de Email"
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      >
        Estas seguro de que deseas eliminar esta campana?
      </ConfirmationModal>

      {/* Report Dialog */}
      <Dialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Reporte de Campana:{" "}
          {reportData?.campaign?.name || ""}
        </DialogTitle>
        <DialogContent dividers>
          {reportData && (
            <>
              <Grid container spacing={3} style={{ marginBottom: 16 }}>
                <Grid item xs={6} md={3}>
                  <Paper className={classes.reportCard} variant="outlined">
                    <Typography variant="caption">Total</Typography>
                    <Typography className={classes.reportValue}>
                      {reportData.stats.totalContacts}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper className={classes.reportCard} variant="outlined">
                    <Typography variant="caption">Enviados</Typography>
                    <Typography
                      className={classes.reportValue}
                      style={{ color: "#4caf50" }}
                    >
                      {reportData.stats.sent}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper className={classes.reportCard} variant="outlined">
                    <Typography variant="caption">Fallidos</Typography>
                    <Typography
                      className={classes.reportValue}
                      style={{ color: "#f44336" }}
                    >
                      {reportData.stats.failed}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper className={classes.reportCard} variant="outlined">
                    <Typography variant="caption">Pendientes</Typography>
                    <Typography
                      className={classes.reportValue}
                      style={{ color: "#ff9800" }}
                    >
                      {reportData.stats.pending}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {reportData.stats.totalContacts > 0 && (
                <Box mb={2}>
                  <Typography variant="body2" gutterBottom>
                    Progreso: {reportData.stats.successRate}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={reportData.stats.successRate}
                  />
                </Box>
              )}

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Enviado</TableCell>
                    <TableCell>Error</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.shippings.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.contactEmail}</TableCell>
                      <TableCell>{s.contactName}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={s.status}
                          color={
                            s.status === "SENT"
                              ? "primary"
                              : s.status === "FAILED"
                              ? "secondary"
                              : "default"
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {s.sentAt
                          ? new Date(s.sentAt).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {s.errorMessage || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportOpen(false)} color="primary">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <MainHeader>
        <Title>Campanas de Email</Title>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder="Buscar..."
            size="small"
            variant="outlined"
            value={searchParam}
            onChange={(e) => setSearchParam(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="disabled" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleOpenModal()}
            startIcon={<AddIcon />}
          >
            Nueva Campana
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Asunto</TableCell>
              <TableCell>Lista</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Enviados</TableCell>
              <TableCell>Fallidos</TableCell>
              <TableCell>IA</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {campaigns.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Box py={4}>
                    <EmailIcon
                      style={{ fontSize: 48, color: "#ccc", marginBottom: 8 }}
                    />
                    <Typography variant="body2" color="textSecondary">
                      No hay campanas de email. Crea una nueva para comenzar.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}

            {campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell>{campaign.name}</TableCell>
                <TableCell>{campaign.subject}</TableCell>
                <TableCell>
                  {campaign.contactList?.name || "-"}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={statusLabels[campaign.status] || campaign.status}
                    color={statusColors[campaign.status] || "default"}
                    className={classes.statusChip}
                  />
                </TableCell>
                <TableCell>{campaign.totalSent || 0}</TableCell>
                <TableCell>{campaign.totalFailed || 0}</TableCell>
                <TableCell>
                  {campaign.useAIVariation ? (
                    <Chip size="small" label="IA" color="primary" />
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleViewReport(campaign.id)}
                    title="Ver Reporte"
                  >
                    <ReportIcon />
                  </IconButton>

                  {["DRAFT", "SCHEDULED", "CANCELLED"].includes(
                    campaign.status
                  ) && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenModal(campaign.id)}
                        title="Editar"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleStart(campaign.id)}
                        title="Iniciar Envio"
                      >
                        <PlayIcon />
                      </IconButton>
                    </>
                  )}

                  {campaign.status === "SENDING" && (
                    <IconButton
                      size="small"
                      color="secondary"
                      onClick={() => handleCancel(campaign.id)}
                      title="Cancelar"
                    >
                      <StopIcon />
                    </IconButton>
                  )}

                  {campaign.status !== "SENDING" && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDeletingId(campaign.id);
                        setConfirmDelete(true);
                      }}
                      title="Eliminar"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {hasMore && (
          <Box display="flex" justifyContent="center" mt={2}>
            <Button
              variant="outlined"
              onClick={() => setPageNumber((prev) => prev + 1)}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : "Cargar mas"}
            </Button>
          </Box>
        )}
      </Paper>
    </MainContainer>
  );
};

export default EmailCampaigns;
