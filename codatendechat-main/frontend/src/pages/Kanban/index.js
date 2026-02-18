import React, { useState, useEffect, useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Typography, CircularProgress, Paper, FormControl, InputLabel, Select, MenuItem } from "@material-ui/core";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import Board from "react-trello";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import { useHistory } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: theme.spacing(1),
    flex: 1,
    width: "100%",
  },
  header: {
    width: "100%",
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  formControl: {
    minWidth: 200,
  },
  button: {
    background: "#10a110",
    border: "none",
    padding: "10px",
    color: "white",
    fontWeight: "bold",
    borderRadius: "5px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
  },
}));

const Kanban = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const { profile, queues } = user;

  const [tags, setTags] = useState([]);
  const [loadingKanban, setLoadingKanban] = useState(true);
  const [file, setFile] = useState({ lanes: [] });
  const [tickets, setTickets] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState("all");

  const jsonString = (user.queues || []).map((queue) => queue?.UserQueue?.queueId).filter(Boolean);

  const fetchTickets = async (queueIds) => {
    try {
      const { data } = await api.get("/ticket/kanban", {
        params: {
          queueIds: JSON.stringify(queueIds),
          showAll: profile === "admin",
        },
      });

      setTickets(data.tickets);
    } catch (err) {
      console.log(err);
      setTickets([]);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await api.get("/tags/kanban");
      const fetchedTags = response.data.lista ?? [];

      setTags(fetchedTags);

      await fetchTickets(jsonString);
    } catch (error) {
      console.log(error);
    }
    setLoadingKanban(false);
  };

  useEffect(() => {
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildTicketCards = (tagTickets) => {
    return tagTickets.map((ticket) => ({
      id: ticket.id.toString(),
      label: "Ticket nº " + ticket.id.toString(),
      description: (
        <div>
          <p>
            {ticket.contact.number}
            <br />
            {ticket.lastMessage}
          </p>
          <button
            className={classes.button}
            onClick={() => {
              handleCardClick(ticket.uuid);
            }}
          >
            {i18n.t("kanban.seeTicket")}
          </button>
        </div>
      ),
      title: ticket.contact.name,
      draggable: true,
      href: "/tickets/" + ticket.uuid,
    }));
  };

  const getTicketsForTag = (tagId) => {
    return tickets.filter((ticket) => {
      const tagIds = ticket.tags.map((t) => t.id);
      return tagIds.includes(tagId);
    });
  };

  const getAiIndicator = (tag) => {
    let indicator = "";
    if (tag.prompt) indicator += " [IA]";
    if (tag.shopifyConnection) indicator += " [Shopify]";
    return indicator;
  };

  const popularCards = () => {
    const filteredTickets = tickets.filter(
      (ticket) => ticket.tags.length === 0
    );

    // Separate tags into: parent tags (have children, no parentId), child tags (have parentId), standalone (no parent, no children)
    const parentTags = tags.filter(
      (t) => !t.parentId && t.children && t.children.length > 0
    );

    const standaloneTags = tags.filter(
      (t) => !t.parentId && (!t.children || t.children.length === 0)
    );

    const lanes = [];

    // 0. Default Lane (Open Tickets) -> Show if "all" or "default"
    if (selectedFlow === "all" || selectedFlow === "default") {
      lanes.push({
        id: "lane0",
        title: i18n.t("kanban.open"),
        label: filteredTickets.length.toString(),
        cards: buildTicketCards(filteredTickets),
      });
    }

    // 1. Standalone Tags -> Show if "all" or "default"
    if (selectedFlow === "all" || selectedFlow === "default") {
      standaloneTags.forEach((tag) => {
        const tagTickets = getTicketsForTag(tag.id);
        lanes.push({
          id: tag.id.toString(),
          title: tag.name + getAiIndicator(tag),
          label: tagTickets.length.toString(),
          cards: buildTicketCards(tagTickets),
          style: { backgroundColor: tag.color, color: "white" },
        });
      });
    }

    // 2. Flow Tags (Parents and their children)
    parentTags.forEach((parent) => {
      // Show if "all" OR if this specific parent is currently selected
      if (selectedFlow === "all" || selectedFlow === parent.id.toString()) {

        // Parent category lane
        const parentTickets = getTicketsForTag(parent.id);
        lanes.push({
          id: parent.id.toString(),
          title: "📁 " + parent.name + getAiIndicator(parent),
          label: parentTickets.length.toString(),
          cards: buildTicketCards(parentTickets),
          style: {
            backgroundColor: parent.color,
            color: "white",
            borderTop: "3px solid rgba(0,0,0,0.3)",
          },
        });

        // Child lanes under this parent
        if (parent.children) {
          parent.children.forEach((child) => {
            const childTickets = getTicketsForTag(child.id);
            lanes.push({
              id: child.id.toString(),
              title: parent.name + " › " + child.name + getAiIndicator(child),
              label: childTickets.length.toString(),
              cards: buildTicketCards(childTickets),
              style: {
                backgroundColor: child.color || parent.color,
                color: "white",
                opacity: 0.95,
              },
            });
          });
        }
      }
    });

    setFile({ lanes });
  };

  const handleCardClick = (uuid) => {
    history.push("/tickets/" + uuid);
  };

  useEffect(() => {
    popularCards();
  }, [tags, tickets, selectedFlow]);

  const handleCardMove = async (cardId, sourceLaneId, targetLaneId) => {
    try {
      await api.delete(`/ticket-tags/${targetLaneId}`);
      toast.success(i18n.t("kanban.toasts.removed"));
      await api.put(`/ticket-tags/${targetLaneId}/${sourceLaneId}`);
      toast.success(i18n.t("kanban.toasts.added"));
    } catch (err) {
      console.log(err);
    }
  };

  const handleFlowChange = (event) => {
    setSelectedFlow(event.target.value);
  };

  if (loadingKanban) {
    return (
      <div className={classes.root}>
        <div className={classes.emptyState}>
          <CircularProgress />
        </div>
      </div>
    );
  }

  // Generate Flow Options for Select
  const flowOptions = tags.filter(
    (t) => !t.parentId && t.children && t.children.length > 0
  );

  return (
    <div className={classes.root}>
      <Paper className={classes.header} elevation={1}>
        <Typography variant="h6">Kanban</Typography>
        <FormControl variant="outlined" className={classes.formControl} size="small">
          <InputLabel id="kanban-flow-label">{i18n.t("kanban.flow") || "Flow"}</InputLabel>
          <Select
            labelId="kanban-flow-label"
            id="kanban-flow-select"
            value={selectedFlow}
            onChange={handleFlowChange}
            label={i18n.t("kanban.flow") || "Flow"}
          >
            <MenuItem value="all">{i18n.t("kanban.all") || "Todos"}</MenuItem>
            <MenuItem value="default">{i18n.t("kanban.default") || "Padrao"}</MenuItem>
            {flowOptions.map((tag) => (
              <MenuItem key={tag.id} value={tag.id.toString()}>
                {tag.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {tickets.length === 0 && tags.length === 0 ? (
        <div className={classes.emptyState}>
          <Typography variant="h6" gutterBottom>
            {i18n.t("kanban.empty.title")}
          </Typography>
          <Typography variant="body2">
            {i18n.t("kanban.empty.description")}
          </Typography>
        </div>
      ) : (
        <Board
          data={file}
          onCardMoveAcrossLanes={handleCardMove}
          style={{ backgroundColor: "rgba(252, 252, 252, 0.03)", width: "100%" }}
        />
      )}
    </div>
  );
};

export default Kanban;
