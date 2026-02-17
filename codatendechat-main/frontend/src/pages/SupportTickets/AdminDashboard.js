import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
  makeStyles,
  Paper,
  Grid,
  Typography,
  Card,
  CardContent,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  IconButton,
  Chip,
} from "@material-ui/core";
import {
  Visibility as ViewIcon,
  FiberNew as NewIcon,
  HourglassEmpty as WaitingIcon,
  Build as InProgressIcon,
  CheckCircle as ResolvedIcon,
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  statCard: {
    textAlign: "center",
    cursor: "pointer",
    transition: "transform 0.15s",
    "&:hover": { transform: "scale(1.03)" },
  },
  statNumber: {
    fontSize: "2rem",
    fontWeight: 700,
  },
  statLabel: {
    fontSize: "0.85rem",
    color: theme.palette.text.secondary,
  },
  cardOpen: { borderLeft: `4px solid #4caf50` },
  cardInProgress: { borderLeft: `4px solid #2196f3` },
  cardWaiting: { borderLeft: `4px solid #ff9800` },
  cardResolved: { borderLeft: `4px solid #9e9e9e` },
  chipOpen: { backgroundColor: "#4caf50", color: "#fff" },
  chipInProgress: { backgroundColor: "#2196f3", color: "#fff" },
  chipWaiting: { backgroundColor: "#ff9800", color: "#fff" },
  chipResolved: { backgroundColor: "#9e9e9e", color: "#fff" },
  chipClosed: { backgroundColor: "#607d8b", color: "#fff" },
  chipLow: { backgroundColor: "#8bc34a", color: "#fff" },
  chipMedium: { backgroundColor: "#ff9800", color: "#fff" },
  chipHigh: { backgroundColor: "#f44336", color: "#fff" },
  chipUrgent: { backgroundColor: "#b71c1c", color: "#fff" },
  sectionTitle: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(1),
    fontWeight: 600,
  },
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

const AdminDashboard = () => {
  const classes = useStyles();
  const history = useHistory();
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, ticketsRes] = await Promise.all([
        api.get("/support-tickets-stats"),
        api.get("/support-tickets"),
      ]);
      setStats(statsRes.data);
      setTickets(ticketsRes.data.tickets || []);
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

  const statCards = [
    { key: "open", label: "Abiertos", icon: <NewIcon style={{ fontSize: 32, color: "#4caf50" }} />, className: classes.cardOpen },
    { key: "inProgress", label: "En Progreso", icon: <InProgressIcon style={{ fontSize: 32, color: "#2196f3" }} />, className: classes.cardInProgress },
    { key: "waitingResponse", label: "Esperando Respuesta", icon: <WaitingIcon style={{ fontSize: 32, color: "#ff9800" }} />, className: classes.cardWaiting },
    { key: "resolved", label: "Resueltos/Cerrados", icon: <ResolvedIcon style={{ fontSize: 32, color: "#9e9e9e" }} />, className: classes.cardResolved },
  ];

  return (
    <MainContainer>
      <MainHeader>
        <Title>Dashboard de Soporte</Title>
      </MainHeader>

      <Paper className={classes.mainPaper} variant="outlined">
        {/* Stats Cards */}
        {stats && (
          <Grid container spacing={3}>
            {statCards.map((card) => (
              <Grid item xs={12} sm={6} md={3} key={card.key}>
                <Card className={`${classes.statCard} ${card.className}`} variant="outlined">
                  <CardContent>
                    {card.icon}
                    <Typography className={classes.statNumber}>
                      {stats[card.key] || 0}
                    </Typography>
                    <Typography className={classes.statLabel}>
                      {card.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Recent Tickets */}
        <Typography variant="h6" className={classes.sectionTitle}>
          Todos los Tickets ({stats?.total || 0})
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Asunto</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Creador</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Prioridad</TableCell>
              <TableCell>Asignado</TableCell>
              <TableCell>Creado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id} hover>
                <TableCell>{ticket.id}</TableCell>
                <TableCell>
                  <strong>{ticket.subject}</strong>
                </TableCell>
                <TableCell>{ticket.company?.name || "-"}</TableCell>
                <TableCell>{ticket.user?.name || "-"}</TableCell>
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
                <TableCell>{ticket.assignee?.name || "Sin asignar"}</TableCell>
                <TableCell>{formatDate(ticket.createdAt)}</TableCell>
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
            {tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography color="textSecondary">
                    No hay tickets de soporte.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default AdminDashboard;
