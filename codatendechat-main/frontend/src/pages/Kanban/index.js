import React, { useState, useEffect, useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Typography, CircularProgress } from "@material-ui/core";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import Board from "react-trello";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import { useHistory } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(1),
    flex: 1,
    width: "100%",
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

  const [tags, setTags] = useState([]);
  const [loadingKanban, setLoadingKanban] = useState(true);

  const fetchTags = async () => {
    try {
      const response = await api.get("/tags/kanban");
      const fetchedTags = response.data.lista ?? [];

      setTags(fetchedTags);

      // Fetch tickets after fetching tags
      await fetchTickets(jsonString);
    } catch (error) {
      console.log(error);
    }
    setLoadingKanban(false);
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const [file, setFile] = useState({
    lanes: [],
  });

  const [tickets, setTickets] = useState([]);
  const { user } = useContext(AuthContext);
  const { profile, queues } = user;
  const jsonString = user.queues.map((queue) => queue.UserQueue.queueId);

  const fetchTickets = async (jsonString) => {
    try {
      const { data } = await api.get("/ticket/kanban", {
        params: {
          queueIds: JSON.stringify(jsonString),
          showAll: profile === "admin",
        },
      });

      setTickets(data.tickets);
    } catch (err) {
      console.log(err);
      setTickets([]);
    }
  };

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

  const popularCards = () => {
    const filteredTickets = tickets.filter(
      (ticket) => ticket.tags.length === 0
    );

    // Separate tags into: parent tags (have children, no parentId), child tags (have parentId), standalone (no parent, no children)
    const parentTags = tags.filter(
      (t) => !t.parentId && t.children && t.children.length > 0
    );
    const childTagIds = new Set();
    parentTags.forEach((p) => {
      if (p.children) {
        p.children.forEach((c) => childTagIds.add(c.id));
      }
    });
    const standaloneTags = tags.filter(
      (t) => !t.parentId && (!t.children || t.children.length === 0)
    );

    const lanes = [
      {
        id: "lane0",
        title: i18n.t("kanban.open"),
        label: filteredTickets.length.toString(),
        cards: buildTicketCards(filteredTickets),
      },
    ];

    // Add standalone tags as regular lanes
    standaloneTags.forEach((tag) => {
      const tagTickets = getTicketsForTag(tag.id);
      lanes.push({
        id: tag.id.toString(),
        title: tag.name,
        label: tagTickets.length.toString(),
        cards: buildTicketCards(tagTickets),
        style: { backgroundColor: tag.color, color: "white" },
      });
    });

    // Add parent categories with their children
    parentTags.forEach((parent) => {
      // Parent category lane (collects tickets directly assigned to parent)
      const parentTickets = getTicketsForTag(parent.id);
      lanes.push({
        id: parent.id.toString(),
        title: "📁 " + parent.name,
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
            title: parent.name + " › " + child.name,
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
    });

    setFile({ lanes });
  };

  const handleCardClick = (uuid) => {
    history.push("/tickets/" + uuid);
  };

  useEffect(() => {
    popularCards();
  }, [tags, tickets]);

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

  if (loadingKanban) {
    return (
      <div className={classes.root}>
        <div className={classes.emptyState}>
          <CircularProgress />
        </div>
      </div>
    );
  }

  if (tickets.length === 0 && tags.length === 0) {
    return (
      <div className={classes.root}>
        <div className={classes.emptyState}>
          <Typography variant="h6" gutterBottom>
            {i18n.t("kanban.empty.title")}
          </Typography>
          <Typography variant="body2">
            {i18n.t("kanban.empty.description")}
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <Board
        data={file}
        onCardMoveAcrossLanes={handleCardMove}
        style={{ backgroundColor: "rgba(252, 252, 252, 0.03)" }}
      />
    </div>
  );
};

export default Kanban;
