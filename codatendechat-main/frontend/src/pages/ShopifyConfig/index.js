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
  Divider,
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
} from "@material-ui/core";
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Sync as SyncIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Store as StoreIcon,
  Add as AddIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";

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
        `Tienda ${params.get("shop") || ""} conectada exitosamente`
      );
      history.replace("/shopify-config");
    } else if (params.get("error")) {
      toast.error("Error al conectar con Shopify. Intenta nuevamente.");
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
      toast.error("Ingresa el dominio de tu tienda Shopify");
      return;
    }

    try {
      setSaving(true);
      await api.post("/shopify-connections/", {
        shopDomain: newShopDomain.trim(),
      });
      toast.success("Conexion creada. Ahora conecta con OAuth.");
      setNewShopDomain("");
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
    if (!window.confirm("Desconectar esta tienda Shopify?")) return;

    try {
      await api.delete(`/shopify-connections/${connectionId}`);
      toast.success("Tienda desconectada");
      await loadConnections();
    } catch (err) {
      toastError(err);
    }
  };

  const handleSync = async (connectionId) => {
    try {
      setSyncing(true);
      await api.post(`/shopify-connections/${connectionId}/sync`);
      toast.info("Sincronizacion iniciada en segundo plano");
    } catch (err) {
      toastError(err);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case "connected":
        return (
          <Chip
            icon={<CheckCircleIcon />}
            label="Conectado"
            className={`${classes.statusChip} ${classes.connected}`}
          />
        );
      case "syncing":
        return (
          <Chip
            icon={<SyncIcon />}
            label="Sincronizando"
            className={`${classes.statusChip} ${classes.syncing}`}
          />
        );
      default:
        return (
          <Chip
            icon={<ErrorIcon />}
            label="Desconectado"
            className={`${classes.statusChip} ${classes.disconnected}`}
          />
        );
    }
  };

  return (
    <MainContainer>
      <MainHeader>
        <Title>Shopify</Title>
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
            Tiendas Conectadas
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setShowNewForm(true)}
          >
            Nueva Conexion
          </Button>
        </Box>

        {/* New Connection Form */}
        {showNewForm && (
          <Card className={classes.infoCard}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Conectar nueva tienda Shopify
              </Typography>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Dominio de la tienda"
                    placeholder="mitienda.myshopify.com"
                    value={newShopDomain}
                    onChange={(e) => setNewShopDomain(e.target.value)}
                    helperText="Ingresa tu dominio .myshopify.com"
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid item>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleCreateConnection}
                    disabled={saving}
                    startIcon={
                      saving ? <CircularProgress size={20} /> : <SaveIcon />
                    }
                  >
                    Crear
                  </Button>
                </Grid>
                <Grid item>
                  <Button onClick={() => setShowNewForm(false)}>
                    Cancelar
                  </Button>
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
            No hay tiendas conectadas. Haz clic en "Nueva Conexion" para
            comenzar.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tienda</TableCell>
                <TableCell>Dominio</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Moneda</TableCell>
                <TableCell>Ultima Sync</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {connections.map((conn) => (
                <TableRow key={conn.id}>
                  <TableCell>{conn.shopName || "-"}</TableCell>
                  <TableCell>{conn.shopDomain}</TableCell>
                  <TableCell>{getStatusChip(conn.status)}</TableCell>
                  <TableCell>{conn.currency || "USD"}</TableCell>
                  <TableCell>
                    {conn.lastSyncAt
                      ? new Date(conn.lastSyncAt).toLocaleString()
                      : "Nunca"}
                  </TableCell>
                  <TableCell align="right">
                    {conn.status === "disconnected" ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<LinkIcon />}
                        onClick={() => handleConnect(conn.id)}
                      >
                        Conectar
                      </Button>
                    ) : (
                      <>
                        <IconButton
                          size="small"
                          title="Sincronizar productos"
                          onClick={() => handleSync(conn.id)}
                          disabled={syncing}
                        >
                          <SyncIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          title="Desconectar"
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

      {/* Products Section */}
      {connections.some((c) => c.status === "connected") && (
        <Paper className={classes.paper}>
          <Typography variant="h6" gutterBottom>
            Catalogo de Productos
          </Typography>

          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Buscar productos..."
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
              No hay productos sincronizados. Haz clic en el boton de sync.
            </Typography>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Imagen</TableCell>
                    <TableCell>Producto</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Precio</TableCell>
                    <TableCell>Stock</TableCell>
                    <TableCell>Estado</TableCell>
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
                  Anterior
                </Button>
                <Typography variant="body2" style={{ alignSelf: "center" }}>
                  Pagina {productPage} de {totalPages}
                </Typography>
                <Button
                  size="small"
                  disabled={productPage >= totalPages}
                  onClick={() => setProductPage((p) => p + 1)}
                >
                  Siguiente
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
