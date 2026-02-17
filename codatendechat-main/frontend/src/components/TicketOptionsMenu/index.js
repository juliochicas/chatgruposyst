import React, { useContext, useEffect, useRef, useState } from "react";

import MenuItem from "@material-ui/core/MenuItem";
import Menu from "@material-ui/core/Menu";

import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ConfirmationModal from "../ConfirmationModal";
import TransferTicketModalCustom from "../TransferTicketModalCustom";
import toastError from "../../errors/toastError";
import { Can } from "../Can";
import { AuthContext } from "../../context/Auth/AuthContext";

import ScheduleModal from "../ScheduleModal";
import KanbanSelectModal from "../KanbanSelectModal";
import { useHistory } from "react-router-dom";

const TicketOptionsMenu = ({ ticket, menuOpen, handleClose, anchorEl }) => {
	const [confirmationOpen, setConfirmationOpen] = useState(false);
	const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
	const isMounted = useRef(true);
	const { user } = useContext(AuthContext);
	const history = useHistory();

	const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
	const [contactId, setContactId] = useState(null);
	const [kanbanModalOpen, setKanbanModalOpen] = useState(false);

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	const handleDeleteTicket = async () => {
		try {
			await api.delete(`/tickets/${ticket.id}`);
		} catch (err) {
			toastError(err);
		}
	};

	const handleOpenConfirmationModal = e => {
		setConfirmationOpen(true);
		handleClose();
	};

	const handleOpenTransferModal = e => {
		setTransferTicketModalOpen(true);
		handleClose();
	};

	const handleCloseTransferTicketModal = () => {
		if (isMounted.current) {
			setTransferTicketModalOpen(false);
		}
	};

	const handleOpenScheduleModal = () => {
		handleClose();
		setContactId(ticket.contact.id);
		setScheduleModalOpen(true);
	}

	const handleCloseScheduleModal = () => {
		setScheduleModalOpen(false);
		setContactId(null);
	}

	const handleOpenKanbanModal = () => {
		handleClose();
		setKanbanModalOpen(true);
	};

	const handleCloseKanbanModal = (result) => {
		setKanbanModalOpen(false);
		if (result === "moved") {
			toast.success(i18n.t("ticketOptionsMenu.kanbanMoved"));
			history.push("/kanban");
		}
	};

	const handleExportChat = async () => {
		handleClose();
		try {
			const { data } = await api.get(`/messages/${ticket.id}/export`);
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", `chat_${ticket.id}_${ticket.contact?.name || "export"}_${new Date().toISOString().split("T")[0]}.json`);
			document.body.appendChild(link);
			link.click();
			link.parentNode.removeChild(link);
			window.URL.revokeObjectURL(url);
			toast.success(i18n.t("ticketOptionsMenu.exportSuccess"));
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<>
			<Menu
				id="menu-appbar"
				anchorEl={anchorEl}
				getContentAnchorEl={null}
				anchorOrigin={{
					vertical: "bottom",
					horizontal: "right",
				}}
				keepMounted
				transformOrigin={{
					vertical: "top",
					horizontal: "right",
				}}
				open={menuOpen}
				onClose={handleClose}
			>
				<MenuItem onClick={handleOpenScheduleModal}>
					{i18n.t("ticketOptionsMenu.schedule")}
				</MenuItem>
				<MenuItem onClick={handleOpenTransferModal}>
					{i18n.t("ticketOptionsMenu.transfer")}
				</MenuItem>
				<MenuItem onClick={handleOpenKanbanModal}>
					{i18n.t("ticketOptionsMenu.moveToKanban")}
				</MenuItem>
				<MenuItem onClick={handleExportChat}>
					{i18n.t("ticketOptionsMenu.export")}
				</MenuItem>
				<Can
					role={user.profile}
					perform="ticket-options:deleteTicket"
					yes={() => (
						<MenuItem onClick={handleOpenConfirmationModal}>
							{i18n.t("ticketOptionsMenu.delete")}
						</MenuItem>
					)}
				/>
			</Menu>
			<ConfirmationModal
				title={`${i18n.t("ticketOptionsMenu.confirmationModal.title")}${
					ticket.id
				} ${i18n.t("ticketOptionsMenu.confirmationModal.titleFrom")} ${
					ticket.contact.name
				}?`}
				open={confirmationOpen}
				onClose={setConfirmationOpen}
				onConfirm={handleDeleteTicket}
			>
				{i18n.t("ticketOptionsMenu.confirmationModal.message")}
			</ConfirmationModal>
			<TransferTicketModalCustom
				modalOpen={transferTicketModalOpen}
				onClose={handleCloseTransferTicketModal}
				ticketid={ticket.id}
			/>
			<ScheduleModal
				open={scheduleModalOpen}
				onClose={handleCloseScheduleModal}
				aria-labelledby="form-dialog-title"
				contactId={contactId}
			/>
			<KanbanSelectModal
				open={kanbanModalOpen}
				onClose={handleCloseKanbanModal}
				ticketId={ticket.id}
			/>
		</>
	);
};

export default TicketOptionsMenu;