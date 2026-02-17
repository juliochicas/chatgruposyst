import React, { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import {
  makeStyles,
  Paper,
  Button,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  IconButton,
  Chip,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from "@material-ui/core";
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Star as StarIcon,
} from "@material-ui/icons";
import { toast } from "react-toastify";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  chipOpen: { backgroundColor: "#4caf50", color: "#fff" },
  chipInProgress: { backgroundColor: "#2196f3", color: "#fff" },
  chipWaiting: { backgroundColor: "#ff9800", color: "#fff" },
  chipResolved: { backgroundColor: "#9e9e9e", color: "#fff" },
  chipClosed: { backgroundColor: "#607d8b", color: "#fff" },
  chipLow: { backgroundColor: "#8bc34a", color: "#fff" },
  chipMedium: { backgroundColor: "#ff9800", color: "#fff" },
  chipHigh: { backgroundColor: "#f44336", color: "#fff" },
  chipUrgent: { backgroundColor: "#b71c1c", color: "#fff" },
}));

const statusLabels = {
  open: "Abierto",
  in_progress: "En Progreso",
  waiting_response: "Esperando Respuesta",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const priorityLabels = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const categoryLabels = {
  billing: "Facturación",
  technical: "Técnico",
  general: "General",
  feature_request: "Solicitud",
  bug: "Error/Bug",
};

const SupportTickets = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: "",
    description: "",
    priority: "medium",
    category: "general",
  });

  const isSuper = user?.super === true;

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/support-tickets");
      setTickets(data.tickets || []);
    } catch (e) {
      toastError(e);
    }
    setLoading(false);
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim()) {
      toast.error("El asunto es requerido.");
      return;
    }
    try {
      await api.post("/support-tickets", newTicket);
      toast.success("Ticket creado exitosamente.");
      setNewTicketOpen(false);
      setNewTicket({ subject: "", description: "", priority: "medium", category: "general" });
      loadTickets();
    } catch (e) {
      toastError(e);
    }
  };

  const getStatusChipClass = (status) => {
    const map = {
      open: classes.chipOpen,
      in_progress: classes.chipInProgress,
      waiting_response: classes.chipWaiting,
      resolved: classes.chipResolved,
      closed: classes.chipClosed,
    };
    return map[status] || "";
  };

  const getPriorityChipClass = (priority) => {
    const map = {
      low: classes.chipLow,
      medium: classes.chipMedium,
      high: classes.chipHigh,
      urgent: classes.chipUrgent,
    };
    return map[priority] || "";
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>{i18n.t("supportTickets.title")}</Title>
        <MainHeaderButtonsWrapper>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setNewTicketOpen(true)}
            startIcon={<AddIcon />}
          >
            {i18n.t("supportTickets.buttons.new")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>{i18n.t("supportTickets.table.subject")}</TableCell>
              {isSuper && <TableCell>{i18n.t("supportTickets.table.company")}</TableCell>}
              <TableCell>{i18n.t("supportTickets.table.status")}</TableCell>
              <TableCell>{i18n.t("supportTickets.table.priority")}</TableCell>
              <TableCell>{i18n.t("supportTickets.table.category")}</TableCell>
              <TableCell>{i18n.t("supportTickets.table.created")}</TableCell>
              <TableCell>{i18n.t("supportTickets.table.lastMessage")}</TableCell>
              <TableCell align="center">{i18n.t("supportTickets.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id} hover>
                <TableCell>{ticket.id}</TableCell>
                <TableCell>
                  <strong>{ticket.subject}</strong>
                  {ticket.rating && (
                    <span style={{ marginLeft: 8 }}>
                      {[...Array(ticket.rating)].map((_, i) => (
                        <StarIcon key={i} style={{ fontSize: 14, color: "#ff9800" }} />
                      ))}
                    </span>
                  )}
                </TableCell>
                {isSuper && (
                  <TableCell>{ticket.company?.name || "-"}</TableCell>
                )}
                <TableCell>
                  <Chip
                    size="small"
                    label={statusLabels[ticket.status] || ticket.status}
                    className={getStatusChipClass(ticket.status)}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={priorityLabels[ticket.priority] || ticket.priority}
                    className={getPriorityChipClass(ticket.priority)}
                  />
                </TableCell>
                <TableCell>
                  {categoryLabels[ticket.category] || ticket.category || "-"}
                </TableCell>
                <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                <TableCell>{formatDate(ticket.lastMessageAt)}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => history.push(`/support-tickets/${ticket.id}`)}
                  >
                    <ViewIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {tickets.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={isSuper ? 9 : 8} align="center">
                  <Typography color="textSecondary">
                    {i18n.t("supportTickets.noTickets")}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* New Ticket Dialog */}
      <Dialog open={newTicketOpen} onClose={() => setNewTicketOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{i18n.t("supportTickets.newTicket.title")}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                label={i18n.t("supportTickets.newTicket.subject")}
                fullWidth
                variant="outlined"
                margin="dense"
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl variant="outlined" margin="dense" fullWidth>
                <InputLabel>{i18n.t("supportTickets.newTicket.priority")}</InputLabel>
                <Select
                  label={i18n.t("supportTickets.newTicket.priority")}
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                >
                  <MenuItem value="low">Baja</MenuItem>
                  <MenuItem value="medium">Media</MenuItem>
                  <MenuItem value="high">Alta</MenuItem>
                  <MenuItem value="urgent">Urgente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl variant="outlined" margin="dense" fullWidth>
                <InputLabel>{i18n.t("supportTickets.newTicket.category")}</InputLabel>
                <Select
                  label={i18n.t("supportTickets.newTicket.category")}
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                >
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="technical">Técnico</MenuItem>
                  <MenuItem value="billing">Facturación</MenuItem>
                  <MenuItem value="feature_request">Solicitud</MenuItem>
                  <MenuItem value="bug">Error/Bug</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={i18n.t("supportTickets.newTicket.description")}
                fullWidth
                variant="outlined"
                margin="dense"
                multiline
                rows={4}
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewTicketOpen(false)}>
            {i18n.t("supportTickets.newTicket.cancel")}
          </Button>
          <Button onClick={handleCreateTicket} color="primary" variant="contained">
            {i18n.t("supportTickets.newTicket.create")}
          </Button>
        </DialogActions>
      </Dialog>
    </MainContainer>
  );
};

export default SupportTickets;
