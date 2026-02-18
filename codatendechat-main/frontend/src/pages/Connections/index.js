import React, { useState, useCallback, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import {
	Button,
	TableBody,
	TableRow,
	TableCell,
	IconButton,
	Table,
	TableHead,
	Paper,
	Tooltip,
	Typography,
	CircularProgress,
	Chip,
} from "@material-ui/core";
import {
	Edit,
	CheckCircle,
	SignalCellularConnectedNoInternet2Bar,
	SignalCellularConnectedNoInternet0Bar,
	SignalCellular4Bar,
	CropFree,
	DeleteOutline,
	Link as LinkIcon,
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";

import api from "../../services/api";
import WhatsAppModal from "../../components/WhatsAppModal";
import MetaConnectionModal from "../../components/MetaConnectionModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import QrcodeModal from "../../components/QrcodeModal";
import { i18n } from "../../translate/i18n";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import toastError from "../../errors/toastError";

import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";

const useStyles = makeStyles(theme => ({
	mainPaper: {
		flex: 1,
		padding: theme.spacing(1),
		overflowY: "scroll",
		...theme.scrollbarStyles,
	},
	customTableCell: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	tooltip: {
		backgroundColor: "#f5f5f9",
		color: "rgba(0, 0, 0, 0.87)",
		fontSize: theme.typography.pxToRem(14),
		border: "1px solid #dadde9",
		maxWidth: 450,
	},
	tooltipPopper: {
		textAlign: "center",
	},
	buttonProgress: {
		color: green[500],
	},
	sectionTitle: {
		padding: theme.spacing(2, 1, 1),
		fontWeight: 600,
		fontSize: 16,
		display: "flex",
		alignItems: "center",
		gap: 8,
	},
	channelChip: {
		fontWeight: 500,
		fontSize: 11,
	},
	metaConnectBtn: {
		fontSize: 12,
	},
}));

const CustomToolTip = ({ title, content, children }) => {
	const classes = useStyles();

	return (
		<Tooltip
			arrow
			classes={{
				tooltip: classes.tooltip,
				popper: classes.tooltipPopper,
			}}
			title={
				<React.Fragment>
					<Typography gutterBottom color="inherit">
						{title}
					</Typography>
					{content && <Typography>{content}</Typography>}
				</React.Fragment>
			}
		>
			{children}
		</Tooltip>
	);
};

const Connections = () => {
	const classes = useStyles();

	const { user } = useContext(AuthContext);
	const { whatsApps, loading } = useContext(WhatsAppsContext);
	const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
	const [metaModalOpen, setMetaModalOpen] = useState(false);
	const [qrModalOpen, setQrModalOpen] = useState(false);
	const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);
	const [selectedMetaConnection, setSelectedMetaConnection] = useState(null);
	const [metaConnections, setMetaConnections] = useState([]);
	const [metaLoading, setMetaLoading] = useState(true);
	const [confirmModalOpen, setConfirmModalOpen] = useState(false);
	const confirmationModalInitialState = {
		action: "",
		title: "",
		message: "",
		whatsAppId: "",
		open: false,
	};
	const [confirmModalInfo, setConfirmModalInfo] = useState(
		confirmationModalInitialState
	);

	// Fetch Meta connections
	const fetchMetaConnections = useCallback(async () => {
		try {
			const { data } = await api.get("/meta-connections/");
			setMetaConnections(data);
			setMetaLoading(false);
		} catch (err) {
			setMetaLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchMetaConnections();
	}, [fetchMetaConnections]);

	// Check for OAuth callback params
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get("meta") === "success") {
			const pageName = params.get("page") || "";
			const instagram = params.get("instagram") || "";
			const threads = params.get("threads") || "";
			toast.success(
				`${i18n.t("metaConnection.connectedSuccess")}${pageName ? ` a Facebook (${pageName})` : ""}${instagram ? ` e Instagram (@${instagram})` : ""}${threads ? ` y Threads (@${threads})` : ""}`
			);
			fetchMetaConnections();
			// Clean URL
			window.history.replaceState({}, document.title, "/connections");
		}
		if (params.get("error")) {
			toast.error(i18n.t("metaConnection.connectionError"));
			window.history.replaceState({}, document.title, "/connections");
		}
	}, [fetchMetaConnections]);

	const handleStartWhatsAppSession = async whatsAppId => {
		try {
			await api.post(`/whatsappsession/${whatsAppId}`);
		} catch (err) {
			toastError(err);
		}
	};

	const handleRequestNewQrCode = async whatsAppId => {
		try {
			await api.put(`/whatsappsession/${whatsAppId}`);
		} catch (err) {
			toastError(err);
		}
	};

	const handleOpenWhatsAppModal = () => {
		setSelectedWhatsApp(null);
		setWhatsAppModalOpen(true);
	};

	const handleCloseWhatsAppModal = useCallback(() => {
		setWhatsAppModalOpen(false);
		setSelectedWhatsApp(null);
	}, [setSelectedWhatsApp, setWhatsAppModalOpen]);

	const handleOpenMetaModal = () => {
		setSelectedMetaConnection(null);
		setMetaModalOpen(true);
	};

	const handleCloseMetaModal = useCallback(() => {
		setMetaModalOpen(false);
		setSelectedMetaConnection(null);
		fetchMetaConnections();
	}, [fetchMetaConnections]);

	const handleOpenQrModal = whatsApp => {
		setSelectedWhatsApp(whatsApp);
		setQrModalOpen(true);
	};

	const handleCloseQrModal = useCallback(() => {
		setSelectedWhatsApp(null);
		setQrModalOpen(false);
	}, [setQrModalOpen, setSelectedWhatsApp]);

	const handleEditWhatsApp = whatsApp => {
		setSelectedWhatsApp(whatsApp);
		setWhatsAppModalOpen(true);
	};

	const handleEditMetaConnection = metaConn => {
		setSelectedMetaConnection(metaConn);
		setMetaModalOpen(true);
	};

	const handleConnectMeta = async (metaConnectionId) => {
		try {
			const { data } = await api.get(`/meta-connections/${metaConnectionId}/oauth-url`);
			window.location.href = data.url;
		} catch (err) {
			toastError(err);
		}
	};

	const handleDeleteMetaConnection = async (metaConnectionId) => {
		try {
			await api.delete(`/meta-connections/${metaConnectionId}`);
			toast.success(i18n.t("connections.toasts.deleted"));
			fetchMetaConnections();
		} catch (err) {
			toastError(err);
		}
	};

	const handleCleanupTickets = async (whatsAppId) => {
		try {
			const { data } = await api.post(`/whatsappsession/${whatsAppId}/cleanup-tickets`);
			toast.success(i18n.t("connections.toasts.cleanupSuccess", { count: data.closedTickets }));
		} catch (err) {
			toastError(err);
		}
	};

	const handleOpenConfirmationModal = (action, whatsAppId) => {
		if (action === "disconnect") {
			setConfirmModalInfo({
				action: action,
				title: i18n.t("connections.confirmationModal.disconnectTitle"),
				message: i18n.t("connections.confirmationModal.disconnectMessage"),
				whatsAppId: whatsAppId,
			});
		}

		if (action === "delete") {
			setConfirmModalInfo({
				action: action,
				title: i18n.t("connections.confirmationModal.deleteTitle"),
				message: i18n.t("connections.confirmationModal.deleteMessage"),
				whatsAppId: whatsAppId,
			});
		}

		if (action === "deleteMeta") {
			setConfirmModalInfo({
				action: action,
				title: i18n.t("connections.confirmationModal.deleteTitle"),
				message: i18n.t("connections.confirmationModal.deleteMessage"),
				whatsAppId: whatsAppId, // reusing field for metaConnectionId
			});
		}

		setConfirmModalOpen(true);
	};

	const handleSubmitConfirmationModal = async () => {
		if (confirmModalInfo.action === "disconnect") {
			try {
				await api.delete(`/whatsappsession/${confirmModalInfo.whatsAppId}`);
			} catch (err) {
				toastError(err);
			}
		}

		if (confirmModalInfo.action === "delete") {
			try {
				await api.delete(`/whatsapp/${confirmModalInfo.whatsAppId}`);
				toast.success(i18n.t("connections.toasts.deleted"));
			} catch (err) {
				toastError(err);
			}
		}

		if (confirmModalInfo.action === "deleteMeta") {
			await handleDeleteMetaConnection(confirmModalInfo.whatsAppId);
		}

		setConfirmModalInfo(confirmationModalInitialState);
	};

	const renderActionButtons = whatsApp => {
		return (
			<>
				{whatsApp.status === "qrcode" && (
					<Button
						size="small"
						variant="contained"
						color="primary"
						onClick={() => handleOpenQrModal(whatsApp)}
					>
						{i18n.t("connections.buttons.qrcode")}
					</Button>
				)}
				{whatsApp.status === "DISCONNECTED" && (
					<>
						<Button
							size="small"
							variant="outlined"
							color="primary"
							onClick={() => handleStartWhatsAppSession(whatsApp.id)}
						>
							{i18n.t("connections.buttons.tryAgain")}
						</Button>{" "}
						<Button
							size="small"
							variant="outlined"
							color="secondary"
							onClick={() => handleRequestNewQrCode(whatsApp.id)}
						>
							{i18n.t("connections.buttons.newQr")}
						</Button>{" "}
						<Button
							size="small"
							variant="outlined"
							onClick={() => handleCleanupTickets(whatsApp.id)}
						>
							{i18n.t("connections.buttons.cleanupTickets")}
						</Button>
					</>
				)}
				{(whatsApp.status === "CONNECTED" ||
					whatsApp.status === "PAIRING" ||
					whatsApp.status === "TIMEOUT") && (
					<Button
						size="small"
						variant="outlined"
						color="secondary"
						onClick={() => {
							handleOpenConfirmationModal("disconnect", whatsApp.id);
						}}
					>
						{i18n.t("connections.buttons.disconnect")}
					</Button>
				)}
				{whatsApp.status === "OPENING" && (
					<Button size="small" variant="outlined" disabled color="default">
						{i18n.t("connections.buttons.connecting")}
					</Button>
				)}
			</>
		);
	};

	const renderMetaActionButtons = metaConn => {
		if (metaConn.status === "CONNECTED") {
			return (
				<Chip
					size="small"
					label={i18n.t("metaConnection.connected")}
					style={{ backgroundColor: green[500], color: "#fff" }}
				/>
			);
		}
		return (
			<Button
				size="small"
				variant="contained"
				className={classes.metaConnectBtn}
				style={{
					backgroundColor: metaConn.channel === "instagram" ? "#E4405F" : "#1877F2",
					color: "#fff",
				}}
				startIcon={<LinkIcon />}
				onClick={() => handleConnectMeta(metaConn.id)}
			>
				{i18n.t("metaConnection.connectWithMeta")}
			</Button>
		);
	};

	const renderStatusToolTips = whatsApp => {
		return (
			<div className={classes.customTableCell}>
				{whatsApp.status === "DISCONNECTED" && (
					<CustomToolTip
						title={i18n.t("connections.toolTips.disconnected.title")}
						content={i18n.t("connections.toolTips.disconnected.content")}
					>
						<SignalCellularConnectedNoInternet0Bar color="secondary" />
					</CustomToolTip>
				)}
				{whatsApp.status === "OPENING" && (
					<CircularProgress size={24} className={classes.buttonProgress} />
				)}
				{whatsApp.status === "qrcode" && (
					<CustomToolTip
						title={i18n.t("connections.toolTips.qrcode.title")}
						content={i18n.t("connections.toolTips.qrcode.content")}
					>
						<CropFree />
					</CustomToolTip>
				)}
				{whatsApp.status === "CONNECTED" && (
					<CustomToolTip title={i18n.t("connections.toolTips.connected.title")}>
						<SignalCellular4Bar style={{ color: green[500] }} />
					</CustomToolTip>
				)}
				{(whatsApp.status === "TIMEOUT" || whatsApp.status === "PAIRING") && (
					<CustomToolTip
						title={i18n.t("connections.toolTips.timeout.title")}
						content={i18n.t("connections.toolTips.timeout.content")}
					>
						<SignalCellularConnectedNoInternet2Bar color="secondary" />
					</CustomToolTip>
				)}
			</div>
		);
	};

	const renderMetaStatus = metaConn => {
		return (
			<div className={classes.customTableCell}>
				{metaConn.status === "CONNECTED" && (
					<SignalCellular4Bar style={{ color: green[500] }} />
				)}
				{metaConn.status === "DISCONNECTED" && (
					<SignalCellularConnectedNoInternet0Bar color="secondary" />
				)}
			</div>
		);
	};

	const getChannelIcon = (channel) => {
		if (channel === "facebook") return <span style={{ color: "#1877F2", fontWeight: "bold", fontSize: 16 }}>FB</span>;
		if (channel === "instagram") return <span style={{ color: "#E4405F", fontWeight: "bold", fontSize: 16 }}>IG</span>;
		if (channel === "threads") return <span style={{ color: "#000", fontWeight: "bold", fontSize: 16 }}>TH</span>;
		return null;
	};

	return (
		<MainContainer>
			<ConfirmationModal
				title={confirmModalInfo.title}
				open={confirmModalOpen}
				onClose={setConfirmModalOpen}
				onConfirm={handleSubmitConfirmationModal}
			>
				{confirmModalInfo.message}
			</ConfirmationModal>
			<QrcodeModal
				open={qrModalOpen}
				onClose={handleCloseQrModal}
				whatsAppId={!whatsAppModalOpen && selectedWhatsApp?.id}
			/>
			<WhatsAppModal
				open={whatsAppModalOpen}
				onClose={handleCloseWhatsAppModal}
				whatsAppId={!qrModalOpen && selectedWhatsApp?.id}
			/>
			<MetaConnectionModal
				open={metaModalOpen}
				onClose={handleCloseMetaModal}
				metaConnectionId={selectedMetaConnection?.id}
			/>
			<MainHeader>
				<Title>{i18n.t("connections.title")}</Title>
				<MainHeaderButtonsWrapper>
					<Can
						role={user.profile}
						perform="connections-page:addConnection"
						yes={() => (
							<>
								<Button
									variant="contained"
									color="primary"
									onClick={handleOpenWhatsAppModal}
								>
									{i18n.t("connections.buttons.add")}
								</Button>
								<Button
									variant="contained"
									style={{
										backgroundColor: "#1877F2",
										color: "#fff",
										marginLeft: 8,
									}}
									onClick={handleOpenMetaModal}
								>
									{i18n.t("metaConnection.addMeta")}
								</Button>
							</>
						)}
					/>
				</MainHeaderButtonsWrapper>
			</MainHeader>

			{/* WhatsApp Connections Table */}
			<Paper className={classes.mainPaper} variant="outlined">
				<div className={classes.sectionTitle}>
					{i18n.t("metaConnection.whatsappSection")}
				</div>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell align="center">
								{i18n.t("connections.table.name")}
							</TableCell>
							<TableCell align="center">
								{i18n.t("connections.table.status")}
							</TableCell>
							<Can
								role={user.profile}
								perform="connections-page:actionButtons"
								yes={() => (
									<TableCell align="center">
										{i18n.t("connections.table.session")}
									</TableCell>
								)}
							/>
							<TableCell align="center">
								{i18n.t("connections.table.lastUpdate")}
							</TableCell>
							<TableCell align="center">
								{i18n.t("connections.table.default")}
							</TableCell>
							<Can
								role={user.profile}
								perform="connections-page:editOrDeleteConnection"
								yes={() => (
									<TableCell align="center">
										{i18n.t("connections.table.actions")}
									</TableCell>
								)}
							/>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							<TableRowSkeleton />
						) : (
							<>
								{whatsApps?.length > 0 &&
									whatsApps.map(whatsApp => (
										<TableRow key={whatsApp.id}>
											<TableCell align="center">{whatsApp.name}</TableCell>
											<TableCell align="center">
												{renderStatusToolTips(whatsApp)}
											</TableCell>
											<Can
												role={user.profile}
												perform="connections-page:actionButtons"
												yes={() => (
													<TableCell align="center">
														{renderActionButtons(whatsApp)}
													</TableCell>
												)}
											/>
											<TableCell align="center">
												{format(parseISO(whatsApp.updatedAt), "dd/MM/yy HH:mm")}
											</TableCell>
											<TableCell align="center">
												{whatsApp.isDefault && (
													<div className={classes.customTableCell}>
														<CheckCircle style={{ color: green[500] }} />
													</div>
												)}
											</TableCell>
											<Can
												role={user.profile}
												perform="connections-page:editOrDeleteConnection"
												yes={() => (
													<TableCell align="center">
														<IconButton
															size="small"
															onClick={() => handleEditWhatsApp(whatsApp)}
														>
															<Edit />
														</IconButton>

														<IconButton
															size="small"
															onClick={e => {
																handleOpenConfirmationModal("delete", whatsApp.id);
															}}
														>
															<DeleteOutline />
														</IconButton>
													</TableCell>
												)}
											/>
										</TableRow>
									))}
							</>
						)}
					</TableBody>
				</Table>

				{/* Meta Connections Table (Facebook + Instagram + Threads) */}
				<div className={classes.sectionTitle}>
					<span style={{ color: "#1877F2", fontWeight: "bold", fontSize: 18 }}>FB</span>
					<span style={{ color: "#E4405F", fontWeight: "bold", fontSize: 18 }}>IG</span>
					<span style={{ color: "#000", fontWeight: "bold", fontSize: 18 }}>TH</span>
					{i18n.t("metaConnection.metaSectionTitle")}
				</div>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell align="center">{i18n.t("metaConnection.channelHeader")}</TableCell>
							<TableCell align="center">{i18n.t("metaConnection.nameHeader")}</TableCell>
							<TableCell align="center">{i18n.t("metaConnection.statusHeader")}</TableCell>
							<TableCell align="center">{i18n.t("metaConnection.accountHeader")}</TableCell>
							<Can
								role={user.profile}
								perform="connections-page:actionButtons"
								yes={() => (
									<TableCell align="center">{i18n.t("metaConnection.sessionHeader")}</TableCell>
								)}
							/>
							<TableCell align="center">{i18n.t("metaConnection.lastUpdateHeader")}</TableCell>
							<Can
								role={user.profile}
								perform="connections-page:editOrDeleteConnection"
								yes={() => (
									<TableCell align="center">{i18n.t("metaConnection.actionsHeader")}</TableCell>
								)}
							/>
						</TableRow>
					</TableHead>
					<TableBody>
						{metaLoading ? (
							<TableRowSkeleton />
						) : (
							<>
								{metaConnections?.length > 0 ? (
									metaConnections.map(metaConn => (
										<TableRow key={`meta-${metaConn.id}`}>
											<TableCell align="center">
												{getChannelIcon(metaConn.channel)}
											</TableCell>
											<TableCell align="center">
												{metaConn.name}
											</TableCell>
											<TableCell align="center">
												{renderMetaStatus(metaConn)}
											</TableCell>
											<TableCell align="center">
												{metaConn.channel === "instagram"
													? metaConn.instagramUsername
														? `@${metaConn.instagramUsername}`
														: "-"
													: metaConn.channel === "threads"
														? metaConn.threadsUsername
															? `@${metaConn.threadsUsername}`
															: "-"
														: metaConn.pageName || "-"}
											</TableCell>
											<Can
												role={user.profile}
												perform="connections-page:actionButtons"
												yes={() => (
													<TableCell align="center">
														{renderMetaActionButtons(metaConn)}
													</TableCell>
												)}
											/>
											<TableCell align="center">
												{format(parseISO(metaConn.updatedAt), "dd/MM/yy HH:mm")}
											</TableCell>
											<Can
												role={user.profile}
												perform="connections-page:editOrDeleteConnection"
												yes={() => (
													<TableCell align="center">
														<IconButton
															size="small"
															onClick={() => handleEditMetaConnection(metaConn)}
														>
															<Edit />
														</IconButton>
														<IconButton
															size="small"
															onClick={() =>
																handleOpenConfirmationModal("deleteMeta", metaConn.id)
															}
														>
															<DeleteOutline />
														</IconButton>
													</TableCell>
												)}
											/>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={7} align="center" style={{ color: "#999", padding: 20 }}>
											{i18n.t("metaConnection.noMetaConnections")}
										</TableCell>
									</TableRow>
								)}
							</>
						)}
					</TableBody>
				</Table>
			</Paper>
		</MainContainer>
	);
};

export default Connections;
