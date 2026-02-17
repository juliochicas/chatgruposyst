import React, { useState, useEffect, useCallback } from "react";
import {
  makeStyles,
  Drawer,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Button,
  Divider,
  Box,
  CircularProgress,
} from "@material-ui/core";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingCart as CartIcon,
  Payment as PaymentIcon,
  DeleteSweep as ClearIcon,
} from "@material-ui/icons";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
  drawer: {
    width: 360,
    padding: theme.spacing(2),
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  totalSection: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: 8,
  },
  checkoutButton: {
    marginTop: theme.spacing(2),
  },
  emptyCart: {
    textAlign: "center",
    padding: theme.spacing(4),
  },
}));

const ShopifyCartDrawer = ({ open, onClose, ticketId }) => {
  const classes = useStyles();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const loadCart = useCallback(async () => {
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
    if (open && ticketId) {
      loadCart();
    }
  }, [open, ticketId, loadCart]);

  const handleUpdateQuantity = async (variantId, newQuantity) => {
    if (!cart) return;
    try {
      const { data } = await api.put(`/shopify/cart/${cart.id}/update`, {
        variantId,
        quantity: newQuantity,
      });
      setCart(data);
    } catch (err) {
      toastError(err);
    }
  };

  const handleRemoveItem = async (variantId) => {
    if (!cart) return;
    try {
      const { data } = await api.delete(`/shopify/cart/${cart.id}/remove`, {
        data: { variantId },
      });
      setCart(data);
    } catch (err) {
      toastError(err);
    }
  };

  const handleClearCart = async () => {
    if (!cart) return;
    try {
      const { data } = await api.post(`/shopify/cart/${cart.id}/clear`);
      setCart(data);
      toast.success("Carrito vaciado");
    } catch (err) {
      toastError(err);
    }
  };

  const handleCheckout = async () => {
    if (!cart) return;
    try {
      setCheckingOut(true);
      const { data } = await api.post(`/shopify/cart/${cart.id}/checkout`);
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank");
        toast.success("Link de pago generado");
      }
    } catch (err) {
      toastError(err);
    } finally {
      setCheckingOut(false);
    }
  };

  const items = cart?.items || [];

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <div className={classes.drawer}>
        <div className={classes.header}>
          <CartIcon color="primary" />
          <Typography variant="h6">Carrito</Typography>
        </div>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <div className={classes.emptyCart}>
            <CartIcon
              style={{ fontSize: 48, color: "#ccc", marginBottom: 8 }}
            />
            <Typography color="textSecondary">
              El carrito esta vacio
            </Typography>
          </div>
        ) : (
          <>
            <List>
              {items.map((item, index) => (
                <React.Fragment key={item.variantId}>
                  <ListItem>
                    <ListItemAvatar>
                      {item.imageUrl ? (
                        <Avatar
                          src={item.imageUrl}
                          variant="rounded"
                          className={classes.itemImage}
                        />
                      ) : (
                        <Avatar variant="rounded">
                          <CartIcon />
                        </Avatar>
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={item.title}
                      secondary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleUpdateQuantity(
                                item.variantId,
                                item.quantity - 1
                              )
                            }
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography variant="body2">
                            {item.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleUpdateQuantity(
                                item.variantId,
                                item.quantity + 1
                              )
                            }
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                          <Typography
                            variant="body2"
                            style={{ marginLeft: 8, fontWeight: 600 }}
                          >
                            ${(parseFloat(item.price) * item.quantity).toFixed(
                              2
                            )}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleRemoveItem(item.variantId)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < items.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            <div className={classes.totalSection}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="subtitle1">Subtotal:</Typography>
                <Typography variant="h6" color="primary">
                  ${Number(cart.subtotal).toFixed(2)} {cart.currency}
                </Typography>
              </Box>
            </div>

            <Button
              fullWidth
              variant="contained"
              color="primary"
              className={classes.checkoutButton}
              startIcon={
                checkingOut ? (
                  <CircularProgress size={20} />
                ) : (
                  <PaymentIcon />
                )
              }
              onClick={handleCheckout}
              disabled={checkingOut}
            >
              Generar Link de Pago
            </Button>

            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              className={classes.checkoutButton}
              startIcon={<ClearIcon />}
              onClick={handleClearCart}
            >
              Vaciar Carrito
            </Button>
          </>
        )}
      </div>
    </Drawer>
  );
};

export default ShopifyCartDrawer;
