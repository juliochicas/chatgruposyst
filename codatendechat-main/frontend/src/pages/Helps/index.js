import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  makeStyles,
  Paper,
  Typography,
  Modal,
  IconButton,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
} from "@material-ui/core";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@material-ui/icons";
import { toast } from "react-toastify";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import ConfirmationModal from "../../components/ConfirmationModal";
import { i18n } from "../../translate/i18n";
import useHelps from "../../hooks/useHelps";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
  mainPaperContainer: {
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 200px)',
  },
  mainPaper: {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: theme.spacing(3),
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  helpPaper: {
    position: 'relative',
    width: '100%',
    minHeight: '340px',
    padding: theme.spacing(2),
    boxShadow: theme.shadows[3],
    borderRadius: theme.spacing(1),
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    maxWidth: '340px',
  },
  paperHover: {
    transition: 'transform 0.3s, box-shadow 0.3s',
    '&:hover': {
      transform: 'scale(1.03)',
      boxShadow: `0 0 8px`,
      color: theme.palette.primary.main,
    },
  },
  videoThumbnail: {
    width: '100%',
    height: 'calc(100% - 80px)',
    objectFit: 'cover',
    borderRadius: `${theme.spacing(1)}px ${theme.spacing(1)}px 0 0`,
  },
  videoTitle: {
    marginTop: theme.spacing(1),
    flex: 1,
  },
  videoDescription: {
    maxHeight: '100px',
    overflow: 'hidden',
  },
  videoModal: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoModalContent: {
    outline: 'none',
    width: '90%',
    maxWidth: 1024,
    aspectRatio: '16/9',
    position: 'relative',
    backgroundColor: 'white',
    borderRadius: theme.spacing(1),
    overflow: 'hidden',
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(1),
  },
}));

const Helps = () => {
  const classes = useStyles();
  const [records, setRecords] = useState([]);
  const [loadingHelps, setLoadingHelps] = useState(true);
  const { list, save, update, remove } = useHelps();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const { user } = useContext(AuthContext);
  const isAdmin = user.profile === "admin";

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({ title: "", description: "", video: "" });

  // Delete confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);

  const fetchData = async () => {
    try {
      const helps = await list();
      setRecords(helps);
    } catch (err) {
      console.log(err);
    }
    setLoadingHelps(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openVideoModal = (video) => {
    setSelectedVideo(video);
  };

  const closeVideoModal = () => {
    setSelectedVideo(null);
  };

  const handleModalClose = useCallback((event) => {
    if (event.key === "Escape") {
      closeVideoModal();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleModalClose);
    return () => {
      document.removeEventListener("keydown", handleModalClose);
    };
  }, [handleModalClose]);

  // Extract YouTube video ID from URL or return as-is
  const extractVideoId = (input) => {
    if (!input) return "";
    // Already a video ID (no slashes or dots)
    if (!/[/.]/.test(input)) return input;
    // Try to extract from YouTube URL
    const match = input.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : input;
  };

  const handleOpenDialog = (record) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        title: record.title || "",
        description: record.description || "",
        video: record.video || "",
      });
    } else {
      setEditingRecord(null);
      setFormData({ title: "", description: "", video: "" });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRecord(null);
    setFormData({ title: "", description: "", video: "" });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error(i18n.t("helps.toasts.error"));
      return;
    }

    const data = {
      ...formData,
      video: extractVideoId(formData.video),
    };

    try {
      if (editingRecord) {
        await update({ ...data, id: editingRecord.id });
      } else {
        await save(data);
      }
      toast.success(i18n.t("helps.toasts.success"));
      handleCloseDialog();
      fetchData();
    } catch (err) {
      toastError(err);
    }
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    try {
      await remove(deletingRecord.id);
      toast.success(i18n.t("helps.toasts.success"));
      setConfirmOpen(false);
      setDeletingRecord(null);
      fetchData();
    } catch (err) {
      toastError(err);
    }
  };

  const renderVideoModal = () => {
    return (
      <Modal
        open={Boolean(selectedVideo)}
        onClose={closeVideoModal}
        className={classes.videoModal}
      >
        <div className={classes.videoModalContent}>
          {selectedVideo && (
            <iframe
              style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
              src={`https://www.youtube.com/embed/${selectedVideo}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </Modal>
    );
  };

  const renderHelps = () => {
    if (loadingHelps) {
      return (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <CircularProgress />
        </div>
      );
    }

    if (!records.length) {
      return (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            {i18n.t("helps.empty.title")}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {i18n.t("helps.empty.description")}
          </Typography>
        </div>
      );
    }

    return (
      <>
        <div className={`${classes.mainPaper} ${classes.mainPaperContainer}`}>
          {records.map((record, key) => (
            <Paper key={key} className={`${classes.helpPaper} ${classes.paperHover}`}>
              <div onClick={() => openVideoModal(record.video)} style={{ flex: 1, cursor: "pointer" }}>
                <img
                  src={`https://img.youtube.com/vi/${record.video}/mqdefault.jpg`}
                  alt="Thumbnail"
                  className={classes.videoThumbnail}
                />
                <Typography variant="button" className={classes.videoTitle}>
                  {record.title}
                </Typography>
                <Typography variant="caption" className={classes.videoDescription}>
                  {record.description}
                </Typography>
              </div>
              {isAdmin && (
                <div className={classes.cardActions}>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenDialog(record); }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeletingRecord(record); setConfirmOpen(true); }}>
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </div>
              )}
            </Paper>
          ))}
        </div>
      </>
    );
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>{i18n.t("helps.title")} ({records.length})</Title>
        <MainHeaderButtonsWrapper>
          {isAdmin && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog(null)}
            >
              {i18n.t("helps.buttons.add") || "Agregar"}
            </Button>
          )}
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <div className={classes.mainPaper}>
        {renderHelps()}
      </div>
      {renderVideoModal()}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRecord ? (i18n.t("helps.dialog.edit") || "Editar Ayuda") : (i18n.t("helps.dialog.add") || "Agregar Ayuda")}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label={i18n.t("helps.grid.title")}
                fullWidth
                variant="outlined"
                margin="dense"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={i18n.t("helps.grid.description")}
                fullWidth
                variant="outlined"
                margin="dense"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={i18n.t("helps.grid.videoCode") || "Codigo del Video (YouTube ID o URL)"}
                fullWidth
                variant="outlined"
                margin="dense"
                value={formData.video}
                onChange={(e) => setFormData({ ...formData, video: e.target.value })}
                helperText="Ej: dQw4w9WgXcQ o https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              />
            </Grid>
            {formData.video && (
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">Vista previa:</Typography>
                <img
                  src={`https://img.youtube.com/vi/${extractVideoId(formData.video)}/mqdefault.jpg`}
                  alt="Preview"
                  style={{ width: "100%", maxWidth: 320, borderRadius: 4, marginTop: 4 }}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            {i18n.t("helps.buttons.cancel") || "Cancelar"}
          </Button>
          <Button onClick={handleSave} color="primary" variant="contained">
            {i18n.t("helps.buttons.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationModal
        title={i18n.t("helps.confirmModal.title")}
        open={confirmOpen}
        onClose={setConfirmOpen}
        onConfirm={handleDelete}
      >
        {i18n.t("helps.confirmModal.confirm")}
      </ConfirmationModal>
    </MainContainer>
  );
};

export default Helps;
