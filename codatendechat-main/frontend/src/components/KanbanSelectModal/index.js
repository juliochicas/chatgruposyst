import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListSubheader,
  CircularProgress,
  Typography,
  Chip,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  listItem: {
    borderRadius: 8,
    marginBottom: 4,
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  selectedItem: {
    backgroundColor: theme.palette.primary.light + "33",
    border: `2px solid ${theme.palette.primary.main}`,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    display: "inline-block",
    marginRight: 8,
    verticalAlign: "middle",
  },
  subHeader: {
    fontWeight: "bold",
    fontSize: "0.9rem",
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.paper,
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    padding: theme.spacing(3),
  },
  aiChip: {
    marginLeft: 8,
    height: 20,
    fontSize: "0.7rem",
  },
}));

const KanbanSelectModal = ({ open, onClose, ticketId }) => {
  const classes = useStyles();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTagId, setSelectedTagId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchKanbanTags = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/tags/kanban");
        setTags(data.lista || []);
      } catch (err) {
        toastError(err);
      }
      setLoading(false);
    };
    fetchKanbanTags();
    setSelectedTagId(null);
  }, [open]);

  // Build a flat lookup of all tags (parents + children) for finding prompt info
  const allTagsFlat = [];
  tags.forEach((tag) => {
    allTagsFlat.push(tag);
    if (tag.children) {
      tag.children.forEach((child) => allTagsFlat.push(child));
    }
  });

  const getSelectedTag = () => {
    return allTagsFlat.find((t) => t.id === selectedTagId);
  };

  const handleConfirm = async () => {
    if (!selectedTagId || !ticketId) return;
    setSubmitting(true);
    try {
      const selectedTag = getSelectedTag();

      // Assign the kanban tag to the ticket
      await api.put(`/ticket-tags/${ticketId}/${selectedTagId}`);

      // Close the ticket and optionally activate AI agent
      const ticketUpdate = {
        status: "closed",
      };

      // If the kanban lane has an AI prompt, activate it
      if (selectedTag && selectedTag.promptId) {
        ticketUpdate.promptId = selectedTag.promptId;
        ticketUpdate.useIntegration = true;
      } else {
        ticketUpdate.useIntegration = false;
        ticketUpdate.promptId = null;
        ticketUpdate.integrationId = null;
      }

      await api.put(`/tickets/${ticketId}`, ticketUpdate);
      onClose("moved");
    } catch (err) {
      toastError(err);
    }
    setSubmitting(false);
  };

  const renderTagLabel = (tag) => {
    return (
      <>
        {tag.name}
        {tag.prompt && (
          <Chip
            label={"IA: " + tag.prompt.name}
            size="small"
            color="secondary"
            className={classes.aiChip}
          />
        )}
        {tag.shopifyConnection && (
          <Chip
            label={"Shopify"}
            size="small"
            color="primary"
            variant="outlined"
            className={classes.aiChip}
          />
        )}
      </>
    );
  };

  // Organize tags: parent tags with children, standalone tags
  const parentTags = tags.filter(
    (t) => !t.parentId && t.children && t.children.length > 0
  );
  const standaloneTags = tags.filter(
    (t) => !t.parentId && (!t.children || t.children.length === 0)
  );

  return (
    <Dialog open={open} onClose={() => onClose(null)} maxWidth="sm" fullWidth>
      <DialogTitle>{i18n.t("kanbanSelectModal.title")}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {i18n.t("kanbanSelectModal.description")}
        </Typography>
        {loading ? (
          <div className={classes.loading}>
            <CircularProgress />
          </div>
        ) : tags.length === 0 ? (
          <Typography variant="body1" color="textSecondary" align="center">
            {i18n.t("kanbanSelectModal.noTags")}
          </Typography>
        ) : (
          <List>
            {standaloneTags.length > 0 && (
              <>
                {standaloneTags.map((tag) => (
                  <ListItem
                    key={tag.id}
                    button
                    className={`${classes.listItem} ${
                      selectedTagId === tag.id ? classes.selectedItem : ""
                    }`}
                    onClick={() => setSelectedTagId(tag.id)}
                  >
                    <span
                      className={classes.colorDot}
                      style={{ backgroundColor: tag.color }}
                    />
                    <ListItemText primary={renderTagLabel(tag)} />
                  </ListItem>
                ))}
              </>
            )}
            {parentTags.map((parent) => (
              <React.Fragment key={parent.id}>
                <ListSubheader className={classes.subHeader}>
                  <span
                    className={classes.colorDot}
                    style={{ backgroundColor: parent.color }}
                  />
                  {parent.name}
                  {parent.prompt && (
                    <Chip
                      label={"IA: " + parent.prompt.name}
                      size="small"
                      color="secondary"
                      className={classes.aiChip}
                    />
                  )}
                </ListSubheader>
                <ListItem
                  button
                  className={`${classes.listItem} ${
                    selectedTagId === parent.id ? classes.selectedItem : ""
                  }`}
                  onClick={() => setSelectedTagId(parent.id)}
                  style={{ paddingLeft: 24 }}
                >
                  <ListItemText
                    primary={parent.name + " (" + i18n.t("kanbanSelectModal.general") + ")"}
                  />
                </ListItem>
                {parent.children &&
                  parent.children.map((child) => (
                    <ListItem
                      key={child.id}
                      button
                      className={`${classes.listItem} ${
                        selectedTagId === child.id ? classes.selectedItem : ""
                      }`}
                      onClick={() => setSelectedTagId(child.id)}
                      style={{ paddingLeft: 40 }}
                    >
                      <span
                        className={classes.colorDot}
                        style={{
                          backgroundColor: child.color || parent.color,
                        }}
                      />
                      <ListItemText primary={renderTagLabel(child)} />
                    </ListItem>
                  ))}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => onClose(null)}
          color="secondary"
          variant="outlined"
          disabled={submitting}
        >
          {i18n.t("kanbanSelectModal.cancel")}
        </Button>
        <Button
          onClick={handleConfirm}
          color="primary"
          variant="contained"
          disabled={!selectedTagId || submitting}
        >
          {submitting ? (
            <CircularProgress size={20} />
          ) : (
            i18n.t("kanbanSelectModal.confirm")
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KanbanSelectModal;
