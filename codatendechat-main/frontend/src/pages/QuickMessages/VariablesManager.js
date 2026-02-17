import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  makeStyles,
  Chip,
} from "@material-ui/core";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@material-ui/icons";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import ConfirmationModal from "../../components/ConfirmationModal";

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(2),
  },
  variableChip: {
    fontFamily: "monospace",
    fontWeight: 600,
  },
}));

const VariablesManager = () => {
  const classes = useStyles();
  const [variables, setVariables] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVar, setEditingVar] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingVar, setDeletingVar] = useState(null);
  const [formData, setFormData] = useState({ key: "", label: "", value: "" });

  const loadVariables = async () => {
    try {
      const { data } = await api.get("/message-variables");
      setVariables(data);
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    loadVariables();
  }, []);

  const handleOpenDialog = (variable) => {
    if (variable) {
      setEditingVar(variable);
      setFormData({ key: variable.key, label: variable.label, value: variable.value });
    } else {
      setEditingVar(null);
      setFormData({ key: "", label: "", value: "" });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingVar(null);
    setFormData({ key: "", label: "", value: "" });
  };

  const handleSave = async () => {
    if (!formData.key.trim() || !formData.label.trim()) {
      toast.error(i18n.t("variablesManager.errors.required"));
      return;
    }
    try {
      if (editingVar) {
        await api.put(`/message-variables/${editingVar.id}`, formData);
        toast.success(i18n.t("variablesManager.toasts.updated"));
      } else {
        await api.post("/message-variables", formData);
        toast.success(i18n.t("variablesManager.toasts.created"));
      }
      handleCloseDialog();
      loadVariables();
    } catch (err) {
      toastError(err);
    }
  };

  const handleDelete = async () => {
    if (!deletingVar) return;
    try {
      await api.delete(`/message-variables/${deletingVar.id}`);
      toast.success(i18n.t("variablesManager.toasts.deleted"));
      setDeleteConfirmOpen(false);
      setDeletingVar(null);
      loadVariables();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <>
      <Paper className={classes.paper} variant="outlined">
        <div className={classes.header}>
          <Typography variant="h6">
            {i18n.t("variablesManager.title")}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog(null)}
          >
            {i18n.t("variablesManager.buttons.add")}
          </Button>
        </div>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {i18n.t("variablesManager.description")}
        </Typography>
        {variables.length === 0 ? (
          <Typography
            variant="body2"
            color="textSecondary"
            style={{ textAlign: "center", padding: 16 }}
          >
            {i18n.t("variablesManager.empty")}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{i18n.t("variablesManager.table.variable")}</TableCell>
                <TableCell>{i18n.t("variablesManager.table.label")}</TableCell>
                <TableCell>{i18n.t("variablesManager.table.value")}</TableCell>
                <TableCell align="center">{i18n.t("variablesManager.table.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {variables.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <Chip
                      label={`{{${v.key}}}`}
                      size="small"
                      color="primary"
                      className={classes.variableChip}
                    />
                  </TableCell>
                  <TableCell>{v.label}</TableCell>
                  <TableCell>{v.value || "-"}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleOpenDialog(v)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDeletingVar(v);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingVar
            ? i18n.t("variablesManager.dialog.editTitle")
            : i18n.t("variablesManager.dialog.addTitle")}
        </DialogTitle>
        <DialogContent>
          <TextField
            label={i18n.t("variablesManager.dialog.key")}
            fullWidth
            variant="outlined"
            margin="dense"
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value })}
            helperText={i18n.t("variablesManager.dialog.keyHelp")}
          />
          <TextField
            label={i18n.t("variablesManager.dialog.label")}
            fullWidth
            variant="outlined"
            margin="dense"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            helperText={i18n.t("variablesManager.dialog.labelHelp")}
          />
          <TextField
            label={i18n.t("variablesManager.dialog.value")}
            fullWidth
            variant="outlined"
            margin="dense"
            multiline
            rows={2}
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            helperText={i18n.t("variablesManager.dialog.valueHelp")}
          />
          {formData.key && (
            <Typography variant="body2" style={{ marginTop: 8 }}>
              {i18n.t("variablesManager.dialog.preview")}:{" "}
              <Chip
                label={`{{${formData.key.replace(/[^a-zA-Z0-9_]/g, "")}}}`}
                size="small"
                color="primary"
              />
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            {i18n.t("variablesManager.buttons.cancel")}
          </Button>
          <Button onClick={handleSave} color="primary" variant="contained">
            {i18n.t("variablesManager.buttons.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationModal
        title={i18n.t("variablesManager.confirmDelete.title")}
        open={deleteConfirmOpen}
        onClose={setDeleteConfirmOpen}
        onConfirm={handleDelete}
      >
        {i18n.t("variablesManager.confirmDelete.message")}
      </ConfirmationModal>
    </>
  );
};

export default VariablesManager;
