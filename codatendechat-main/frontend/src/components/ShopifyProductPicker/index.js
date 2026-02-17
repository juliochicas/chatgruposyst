import React, { useState, useEffect, useCallback } from "react";
import {
  makeStyles,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@material-ui/core";
import { Store as StoreIcon } from "@material-ui/icons";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import ShopifyProductCard from "../ShopifyProductCard";

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    minHeight: 400,
    padding: theme.spacing(2),
  },
  searchBar: {
    marginBottom: theme.spacing(2),
  },
  productGrid: {
    maxHeight: 500,
    overflowY: "auto",
  },
  emptyState: {
    textAlign: "center",
    padding: theme.spacing(4),
  },
}));

const ShopifyProductPicker = ({ open, onClose, onSelectProduct }) => {
  const classes = useStyles();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/shopify/products", {
        params: {
          search: search || undefined,
          category: category || undefined,
          available: true,
          limit: 50,
        },
      });
      setProducts(data.products);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await api.get("/shopify/categories");
      setCategories(data);
    } catch (err) {
      // Silently fail - categories are optional
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadProducts();
      loadCategories();
    }
  }, [open, loadProducts, loadCategories]);

  const handleSelectProduct = (product) => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <StoreIcon style={{ verticalAlign: "middle", marginRight: 8 }} />
        Seleccionar Producto
      </DialogTitle>
      <DialogContent className={classes.dialogContent}>
        {/* Search & Filters */}
        <Grid container spacing={2} className={classes.searchBar}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl variant="outlined" size="small" fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                label="Categoria"
              >
                <MenuItem value="">Todas</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Products Grid */}
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : products.length === 0 ? (
          <div className={classes.emptyState}>
            <StoreIcon
              style={{ fontSize: 48, color: "#ccc", marginBottom: 8 }}
            />
            <Typography color="textSecondary">
              No se encontraron productos
            </Typography>
          </div>
        ) : (
          <Grid container spacing={1} className={classes.productGrid}>
            {products.map((product) => (
              <Grid item xs={6} sm={4} md={3} key={product.id}>
                <ShopifyProductCard
                  product={product}
                  onAddToCart={handleSelectProduct}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShopifyProductPicker;
