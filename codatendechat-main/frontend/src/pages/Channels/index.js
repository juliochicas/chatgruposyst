import React, { useEffect, useReducer, useState } from "react";
import { toast } from "react-toastify";

import {
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip
} from "@material-ui/core";
import { DeleteOutline, Edit, Refresh } from "@material-ui/icons";
import SearchIcon from "@material-ui/icons/Search";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ChannelModal from "../../components/ChannelModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import usePlans from "../../hooks/usePlans";
import { makeStyles } from "@material-ui/core/styles";

const reducer = (state, action) => {
  switch (action.type) {
    case "LOAD":
      return action.payload;
    case "UPDATE": {
      const channel = action.payload;
      const index = state.findIndex((item) => item.id === channel.id);
      if (index !== -1) {
        state[index] = channel;
        return [...state];
      }
      return [channel, ...state];
    }
    case "DELETE": {
      const id = action.payload;
      return state.filter((channel) => channel.id !== id);
    }
    default:
      return state;
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    margin: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles
  },
  searchInput: {
    marginRight: theme.spacing(1),
    width: "100%",
    maxWidth: 300
  }
}));

const Channels = () => {
  const classes = useStyles();
  const [channels, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [channelSelected, setChannelSelected] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [channelDelete, setChannelDelete] = useState(null);
  const { getPlanCompany } = usePlans();

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/channels", {
        params: { searchParam }
      });
      dispatch({ type: "LOAD", payload: data });
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const verifyPlan = async () => {
      const companyId = localStorage.getItem("companyId");
      const planConfigs = await getPlanCompany(undefined, companyId);
      if (!planConfigs.plan.useIntegrations) {
        toast.error(i18n.t("messagesAPI.toasts.unauthorized"));
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      }
    };
    verifyPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchChannels();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParam]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("meta_status");
    if (status) {
      if (status === "success") {
        toast.success(i18n.t("channels.toasts.connected"));
        fetchChannels();
      } else {
        const message = params.get("meta_message");
        toast.error(
          message || i18n.t("channels.toasts.connectionFailed")
        );
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("meta_status");
      url.searchParams.delete("meta_message");
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);

  const handleAddChannel = () => {
    setChannelSelected(null);
    setModalOpen(true);
  };

  const handleEditChannel = (channel) => {
    setChannelSelected(channel);
    setModalOpen(true);
  };

  const handleDeleteChannel = (channel) => {
    setChannelDelete(channel);
    setConfirmOpen(true);
  };

  const confirmDeleteChannel = async () => {
    try {
      await api.delete(`/channels/${channelDelete.id}`);
      dispatch({ type: "DELETE", payload: channelDelete.id });
      toast.success(i18n.t("channels.toasts.deleted"));
    } catch (err) {
      toastError(err);
    } finally {
      setConfirmOpen(false);
      setChannelDelete(null);
    }
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setChannelSelected(null);
  };

  const handleModalSaved = (channel) => {
    dispatch({ type: "UPDATE", payload: channel });
  };

  const handleConnectMeta = async () => {
    try {
      const { data } = await api.get("/channels/meta/oauth-url");
      window.open(
        data.url,
        "_blank",
        "noopener,noreferrer,width=700,height=800"
      );
      toast.info(i18n.t("channels.toasts.authWindow"));
    } catch (err) {
      toastError(err);
    }
  };

  const statusLabel = (status) =>
    status === "inactive"
      ? i18n.t("channels.status.inactive")
      : i18n.t("channels.status.active");

  return (
    <MainContainer>
      <ConfirmationModal
        open={confirmOpen}
        onClose={setConfirmOpen}
        onConfirm={confirmDeleteChannel}
        title={
          channelDelete
            ? `${i18n.t("channels.confirmation.deleteTitle")} ${
                channelDelete.name
              }?`
            : i18n.t("channels.confirmation.deleteTitle")
        }
      >
        {channelDelete &&
          i18n.t("channels.confirmation.deleteMessage", {
            name: channelDelete.name
          })}
      </ConfirmationModal>

      <ChannelModal
        open={modalOpen}
        onClose={handleModalClose}
        channel={channelSelected}
        onSaved={handleModalSaved}
      />

      <MainHeader>
        <Title>
          {i18n.t("channels.title")} ({channels.length})
        </Title>
        <MainHeaderButtonsWrapper>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddChannel}
          >
            {i18n.t("channels.buttons.add")}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleConnectMeta}
          >
            {i18n.t("channels.buttons.connectMeta")}
          </Button>
          <Tooltip title="Refresh">
            <IconButton color="primary" onClick={fetchChannels}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper className={classes.mainPaper} variant="outlined">
        <TextField
          className={classes.searchInput}
          placeholder={i18n.t("contacts.searchPlaceholder")}
          value={searchParam}
          onChange={handleSearch}
          size="small"
          variant="outlined"
          InputProps={{
            startAdornment: <SearchIcon />
          }}
        />

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{i18n.t("channels.table.name")}</TableCell>
              <TableCell>{i18n.t("channels.table.type")}</TableCell>
              <TableCell>{i18n.t("channels.table.provider")}</TableCell>
              <TableCell>{i18n.t("channels.table.status")}</TableCell>
              <TableCell>{i18n.t("channels.table.externalId")}</TableCell>
              <TableCell>{i18n.t("channels.table.updatedAt")}</TableCell>
              <TableCell align="center">
                {i18n.t("channels.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {channels.map((channel) => (
              <TableRow key={channel.id}>
                <TableCell>{channel.name}</TableCell>
                <TableCell>{channel.type}</TableCell>
                <TableCell>{channel.provider}</TableCell>
                <TableCell>{statusLabel(channel.status)}</TableCell>
                <TableCell>{channel.externalId}</TableCell>
                <TableCell>
                  {channel.updatedAt
                    ? new Date(channel.updatedAt).toLocaleString()
                    : "-"}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title={i18n.t("channels.modal.editTitle")}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEditChannel(channel)}
                    >
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={i18n.t("confirmationModal.buttons.confirm")}>
                    <IconButton
                      size="small"
                      color="secondary"
                      onClick={() => handleDeleteChannel(channel)}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {loading && <TableRowSkeleton columns={7} />}
            {!loading && channels.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {i18n.t("contacts.noContactMessage")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Channels;

