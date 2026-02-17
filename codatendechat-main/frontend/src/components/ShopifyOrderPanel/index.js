import React, { useState, useEffect, useCallback } from "react";
import {
  makeStyles,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Box,
  CircularProgress,
  Divider,
  Button,
} from "@material-ui/core";
import {
  ShoppingCart as CartIcon,
  Payment as PaymentIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CompletedIcon,
  Store as StoreIcon,
} from "@material-ui/icons";

import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
    maxHeight: 400,
    overflowY: "auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  orderItem: {
    borderLeft: `3px solid ${theme.palette.primary.main}`,
    marginBottom: theme.spacing(1),
    borderRadius: 4,
    backgroundColor: theme.palette.background.default,
  },
  statusChip: {
    fontSize: 11,
  },
  emptyState: {
    textAlign: "center",
    padding: theme.spacing(2),
  },
}));

const ShopifyOrderPanel = ({ ticketId, contactId }) => {
  const classes = useStyles();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadCartData = useCallback(async () => {
    if (!ticketId) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/shopify/cart/${ticketId}`);
      setCart(data);
    } catch (err) {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadCartData();
  }, [loadCartData]);

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CartIcon color="primary" />;
      case "checkout":
        return <PaymentIcon style={{ color: "#ff9800" }} />;
      case "completed":
        return <CompletedIcon style={{ color: "#4caf50" }} />;
      default:
        return <StoreIcon />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "active":
        return "Activo";
      case "checkout":
        return "En proceso de pago";
      case "completed":
        return "Completado";
      case "abandoned":
        return "Abandonado";
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "primary";
      case "completed":
        return "primary";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!cart) {
    return (
      <div className={classes.emptyState}>
        <CartIcon style={{ fontSize: 32, color: "#ccc" }} />
        <Typography variant="body2" color="textSecondary">
          Sin carrito activo
        </Typography>
      </div>
    );
  }

  const items = cart.items || [];

  return (
    <Paper className={classes.root} elevation={0}>
      <div className={classes.header}>
        {getStatusIcon(cart.status)}
        <Typography variant="subtitle2">
          Carrito - {getStatusLabel(cart.status)}
        </Typography>
        <Chip
          size="small"
          label={getStatusLabel(cart.status)}
          color={getStatusColor(cart.status)}
          className={classes.statusChip}
        />
      </div>

      {cart.shopifyOrderNumber && (
        <Typography variant="caption" color="textSecondary">
          Pedido: {cart.shopifyOrderNumber}
        </Typography>
      )}

      <Divider style={{ margin: "8px 0" }} />

      {items.length > 0 ? (
        <List dense>
          {items.map((item) => (
            <ListItem key={item.variantId} className={classes.orderItem}>
              <ListItemText
                primary={`${item.quantity}x ${item.title}`}
                secondary={`$${(parseFloat(item.price) * item.quantity).toFixed(2)}`}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="textSecondary">
          Carrito vacio
        </Typography>
      )}

      <Box display="flex" justifyContent="space-between" mt={1}>
        <Typography variant="subtitle2">Total:</Typography>
        <Typography variant="subtitle2" color="primary">
          ${Number(cart.subtotal).toFixed(2)} {cart.currency}
        </Typography>
      </Box>

      {cart.checkoutUrl && (
        <Button
          fullWidth
          size="small"
          variant="outlined"
          color="primary"
          startIcon={<PaymentIcon />}
          onClick={() => window.open(cart.checkoutUrl, "_blank")}
          style={{ marginTop: 8 }}
        >
          Ver Checkout
        </Button>
      )}
    </Paper>
  );
};

export default ShopifyOrderPanel;
