import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { useHistory, useLocation } from "react-router-dom";
import {
  makeStyles,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Chip,
  Box,
  Card,
  CardContent,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from "@material-ui/core";
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Sync as SyncIcon,
  Save as SaveIcon,
  Store as StoreIcon,
  Add as AddIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  paper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  statusChip: {
    fontWeight: "bold",
    fontSize: 14,
    padding: theme.spacing(1),
  },
  connected: {
    backgroundColor: "#4caf50",
    color: "#fff",
  },
  disconnected: {
    backgroundColor: "#f44336",
    color: "#fff",
  },
  syncing: {
    backgroundColor: "#ff9800",
    color: "#fff",
  },
  infoCard: {
    backgroundColor: theme.palette.background.default,
    marginBottom: theme.spacing(2),
  },
  buttonGroup: {
    display: "flex",
    gap: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  tableContainer: {
    marginTop: theme.spacing(2),
  },
  productImage: {
    width: 50,
    height: 50,
    objectFit: "cover",
    borderRadius: 4,
  },
  credentialChip: {
    fontFamily: "monospace",
    fontSize: 12,
  },
}));

const ShopifyConfig = () => {
  const classes = useStyles();
  const history = useHistory();
  const location = useLocation();

  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // New connection form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newShopDomain, setNewShopDomain] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newApiSecret, setNewApiSecret] = useState("");
  const [showNewSecret, setShowNewSecret] = useState(false);

  // Edit credentials dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingConn, setEditingConn] = useState(null);
  const [editApiKey, setEditApiKey] = useState("");
  const [editApiSecret, setEditApiSecret] = useState("");
  const [showEditSecret, setShowEditSecret] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Products
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Check for OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("status") === "success") {
      toast.success(
        i18n.t("shopifyConfig.toasts.storeConnectedSuccess", { shop: params.get("shop") || "" })
      );
      history.replace("/shopify-config");
    } else if (params.get("error")) {
      toast.error(i18n.t("shopifyConfig.toasts.connectionError"));
      history.replace("/shopify-config");
    }
  }, [location, history]);

  const loadConnections = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/shopify-connections/");
      setConnections(data);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const { data } = await api.get("/shopify/products", {
        params: {
          search: productSearch || undefined,
          page: productPage,
          limit: 20,
        },
      });
      setProducts(data.products);
      setTotalPages(data.totalPages);
    } catch (err) {
      // Products may not be synced yet
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, [productSearch, productPage]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    if (connections.some((c) => c.status === "connected")) {
      loadProducts();
    }
  }, [connections, loadProducts]);

  const handleCreateConnection = async () => {
    if (!newShopDomain.trim()) {
      toast.error(i18n.t("shopifyConfig.toasts.enterDomain"));
      return;
    }
    if (!newApiKey.trim() || !newApiSecret.trim()) {
      toast.error(i18n.t("shopifyConfig.toasts.enterCredentials"));
      return;
    }

    try {
      setSaving(true);
      await api.post("/shopify-connections/", {
        shopDomain: newShopDomain.trim(),
        apiKey: newApiKey.trim(),
        apiSecret: newApiSecret.trim(),
      });
      toast.success(i18n.t("shopifyConfig.toasts.connectionCreated"));
      setNewShopDomain("");
      setNewApiKey("");
      setNewApiSecret("");
      setShowNewForm(false);
      await loadConnections();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async (connectionId) => {
    try {
      const { data } = await api.get(
        `/shopify-connections/${connectionId}/oauth-url`
      );
      window.location.href = data.url;
    } catch (err) {
      toastError(err);
    }
  };

  const handleDisconnect = async (connectionId) => {
    if (!window.confirm(i18n.t("shopifyConfig.confirmDisconnect"))) return;

    try {
      await api.delete(`/shopify-connections/${connectionId}`);
      toast.success(i18n.t("shopifyConfig.toasts.storeDisconnected"));
      await loadConnections();
    } catch (err) {
      toastError(err);
    }
  };

  const handleSync = async (connectionId) => {
    try {
      setSyncing(true);
      await api.post(`/shopify-connections/${connectionId}/sync`);
      toast.info(i18n.t("shopifyConfig.toasts.syncStarted"));
    } catch (err) {
      toastError(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenEditDialog = (conn) => {
    setEditingConn(conn);
    setEditApiKey(conn.apiKey || "");
    setEditApiSecret(conn.apiSecret || "");
    setShowEditSecret(false);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingConn(null);
    setEditApiKey("");
    setEditApiSecret("");
  };

  const handleSaveCredentials = async () => {
    if (!editApiKey.trim() || !editApiSecret.trim()) {
      toast.error(i18n.t("shopifyConfig.toasts.fieldsRequired"));
      return;
    }
    try {
      setEditSaving(true);
      await api.put(`/shopify-connections/${editingConn.id}`, {
        apiKey: editApiKey.trim(),
        apiSecret: editApiSecret.trim(),
      });
      toast.success(i18n.t("shopifyConfig.toasts.credentialsUpdated"));
      handleCloseEditDialog();
      await loadConnections();
    } catch (err) {
      toastError(err);
    } finally {
      setEditSaving(false);
    }
  };

  const maskSecret = (secret) => {
    if (!secret) return "-";
    if (secret.length <= 8) return "****";
    return secret.substring(0, 4) + "****" + secret.substring(secret.length - 4);
  };

  const getStatusChip = (status) => {
    switch (status) {
      case "connected":
        return (
          <Chip
            icon={<CheckCircleIcon />}
            label={i18n.t("shopifyConfig.status.connected")}
            className={`${classes.statusChip} ${classes.connected}`}
          />
        );
      case "syncing":
        return (
          <Chip
            icon={<SyncIcon />}
            label={i18n.t("shopifyConfig.status.syncing")}
            className={`${classes.statusChip} ${classes.syncing}`}
          />
        );
      default:
        return (
          <Chip
            icon={<ErrorIcon />}
            label={i18n.t("shopifyConfig.status.disconnected")}
            className={`${classes.statusChip} ${classes.disconnected}`}
          />
        );
    }
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>{i18n.t("shopifyConfig.title")}</Title>
      </MainHeader>

      <Paper className={classes.paper}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">
            <StoreIcon style={{ verticalAlign: "middle", marginRight: 8 }} />
            {i18n.t("shopifyConfig.connectedStores")}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setShowNewForm(true)}
          >
            {i18n.t("shopifyConfig.newConnection")}
          </Button>
        </Box>

        {/* New Connection Form */}
        {showNewForm && (
          <Card className={classes.infoCard}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                {i18n.t("shopifyConfig.connectNewStore")}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {i18n.t("shopifyConfig.credentialsHelp")}{" "}
                <strong>{i18n.t("shopifyConfig.credentialsPath")}</strong>
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={i18n.t("shopifyConfig.form.storeDomain")}
                    placeholder={i18n.t("shopifyConfig.form.storeDomainPlaceholder")}
                    value={newShopDomain}
                    onChange={(e) => setNewShopDomain(e.target.value)}
                    helperText={i18n.t("shopifyConfig.form.storeDomainHelper")}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={i18n.t("shopifyConfig.form.apiKey")}
                    placeholder={i18n.t("shopifyConfig.form.apiKeyPlaceholder")}
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={i18n.t("shopifyConfig.form.apiSecret")}
                    placeholder={i18n.t("shopifyConfig.form.apiSecretPlaceholder")}
                    value={newApiSecret}
                    onChange={(e) => setNewApiSecret(e.target.value)}
                    type={showNewSecret ? "text" : "password"}
                    variant="outlined"
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowNewSecret(!showNewSecret)}
                          >
                            {showNewSecret ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" gap={1}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleCreateConnection}
                      disabled={saving}
                      startIcon={
                        saving ? <CircularProgress size={20} /> : <SaveIcon />
                      }
                    >
                      {i18n.t("shopifyConfig.buttons.create")}
                    </Button>
                    <Button onClick={() => { setShowNewForm(false); setNewShopDomain(""); setNewApiKey(""); setNewApiSecret(""); }}>
                      {i18n.t("shopifyConfig.buttons.cancel")}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Connections List */}
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : connections.length === 0 ? (
          <Typography color="textSecondary" align="center">
            {i18n.t("shopifyConfig.noStores")}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{i18n.t("shopifyConfig.table.store")}</TableCell>
                <TableCell>{i18n.t("shopifyConfig.table.domain")}</TableCell>
                <TableCell>{i18n.t("shopifyConfig.table.apiKey")}</TableCell>
                <TableCell>{i18n.t("shopifyConfig.table.status")}</TableCell>
                <TableCell>{i18n.t("shopifyConfig.table.currency")}</TableCell>
                <TableCell>{i18n.t("shopifyConfig.table.lastSync")}</TableCell>
                <TableCell align="right">{i18n.t("shopifyConfig.table.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {connections.map((conn) => (
                <TableRow key={conn.id}>
                  <TableCell>{conn.shopName || "-"}</TableCell>
                  <TableCell>{conn.shopDomain}</TableCell>
                  <TableCell>
                    <Typography variant="caption" className={classes.credentialChip}>
                      {conn.apiKey ? maskSecret(conn.apiKey) : <em style={{ color: "#f44336" }}>{i18n.t("shopifyConfig.table.notConfigured")}</em>}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(conn.status)}</TableCell>
                  <TableCell>{conn.currency || "USD"}</TableCell>
                  <TableCell>
                    {conn.lastSyncAt
                      ? new Date(conn.lastSyncAt).toLocaleString()
                      : i18n.t("shopifyConfig.table.never")}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      title={i18n.t("shopifyConfig.buttons.editCredentials")}
                      onClick={() => handleOpenEditDialog(conn)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {conn.status === "disconnected" ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<LinkIcon />}
                        onClick={() => handleConnect(conn.id)}
                        disabled={!conn.apiKey}
                      >
                        {i18n.t("shopifyConfig.buttons.connect")}
                      </Button>
                    ) : (
                      <>
                        <IconButton
                          size="small"
                          title={i18n.t("shopifyConfig.buttons.sync")}
                          onClick={() => handleSync(conn.id)}
                          disabled={syncing}
                        >
                          <SyncIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          title={i18n.t("shopifyConfig.buttons.disconnect")}
                          onClick={() => handleDisconnect(conn.id)}
                        >
                          <LinkOffIcon color="error" />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Edit Credentials Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {i18n.t("shopifyConfig.credentialDialog.title")} - {editingConn?.shopDomain}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {i18n.t("shopifyConfig.credentialsHelp")}{" "}
            <strong>{i18n.t("shopifyConfig.credentialsPath")}</strong>
          </Typography>
          <TextField
            fullWidth
            label={i18n.t("shopifyConfig.form.apiKey")}
            value={editApiKey}
            onChange={(e) => setEditApiKey(e.target.value)}
            variant="outlined"
            margin="dense"
          />
          <TextField
            fullWidth
            label={i18n.t("shopifyConfig.form.apiSecret")}
            value={editApiSecret}
            onChange={(e) => setEditApiSecret(e.target.value)}
            type={showEditSecret ? "text" : "password"}
            variant="outlined"
            margin="dense"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowEditSecret(!showEditSecret)}
                  >
                    {showEditSecret ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} color="secondary">
            {i18n.t("shopifyConfig.buttons.cancel")}
          </Button>
          <Button
            onClick={handleSaveCredentials}
            color="primary"
            variant="contained"
            disabled={editSaving}
            startIcon={editSaving ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {i18n.t("shopifyConfig.buttons.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Products Section */}
      {connections.some((c) => c.status === "connected") && (
        <Paper className={classes.paper}>
          <Typography variant="h6" gutterBottom>
            {i18n.t("shopifyConfig.products.title")}
          </Typography>

          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder={i18n.t("shopifyConfig.products.searchPlaceholder")}
            value={productSearch}
            onChange={(e) => {
              setProductSearch(e.target.value);
              setProductPage(1);
            }}
            style={{ marginBottom: 16 }}
          />

          {productsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : products.length === 0 ? (
            <Typography color="textSecondary" align="center">
              {i18n.t("shopifyConfig.products.noProducts")}
            </Typography>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{i18n.t("shopifyConfig.products.image")}</TableCell>
                    <TableCell>{i18n.t("shopifyConfig.products.product")}</TableCell>
                    <TableCell>{i18n.t("shopifyConfig.products.type")}</TableCell>
                    <TableCell>{i18n.t("shopifyConfig.products.price")}</TableCell>
                    <TableCell>{i18n.t("shopifyConfig.products.stock")}</TableCell>
                    <TableCell>{i18n.t("shopifyConfig.products.status")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className={classes.productImage}
                          />
                        ) : (
                          <StoreIcon color="disabled" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" style={{ fontWeight: 500 }}>
                          {product.title}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {product.vendor}
                        </Typography>
                      </TableCell>
                      <TableCell>{product.productType || "-"}</TableCell>
                      <TableCell>
                        ${Number(product.priceMin).toFixed(2)}{" "}
                        {product.priceMin !== product.priceMax &&
                          `- $${Number(product.priceMax).toFixed(2)}`}{" "}
                        {product.currency}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={product.totalInventory}
                          color={
                            product.totalInventory > 0 ? "primary" : "default"
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={product.status}
                          color={
                            product.status === "active" ? "primary" : "default"
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <Box
                display="flex"
                justifyContent="center"
                mt={2}
                gap={1}
              >
                <Button
                  size="small"
                  disabled={productPage <= 1}
                  onClick={() => setProductPage((p) => p - 1)}
                >
                  {i18n.t("shopifyConfig.products.previous")}
                </Button>
                <Typography variant="body2" style={{ alignSelf: "center" }}>
                  {i18n.t("shopifyConfig.products.pageOf", { page: productPage, totalPages })}
                </Typography>
                <Button
                  size="small"
                  disabled={productPage >= totalPages}
                  onClick={() => setProductPage((p) => p + 1)}
                >
                  {i18n.t("shopifyConfig.products.next")}
                </Button>
              </Box>
            </>
          )}
        </Paper>
      )}
    </MainContainer>
  );
};

export default ShopifyConfig;
