import React from "react";
import {
  makeStyles,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
} from "@material-ui/core";
import {
  ShoppingCart as CartIcon,
  OpenInNew as OpenIcon,
} from "@material-ui/icons";

const useStyles = makeStyles((theme) => ({
  card: {
    maxWidth: 280,
    margin: theme.spacing(0.5),
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  media: {
    height: 160,
    backgroundSize: "contain",
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: theme.spacing(1.5),
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.3,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  price: {
    fontSize: 16,
    fontWeight: 700,
    color: theme.palette.primary.main,
    marginTop: theme.spacing(0.5),
  },
  stockChip: {
    fontSize: 11,
    height: 22,
    marginTop: theme.spacing(0.5),
  },
  actions: {
    padding: theme.spacing(0.5, 1.5, 1.5),
    justifyContent: "space-between",
  },
}));

const ShopifyProductCard = ({ product, onAddToCart, onView }) => {
  const classes = useStyles();

  if (!product) return null;

  const isAvailable = product.totalInventory > 0;

  return (
    <Card className={classes.card}>
      {product.imageUrl && (
        <CardMedia
          className={classes.media}
          image={product.imageUrl}
          title={product.title}
        />
      )}
      <CardContent className={classes.content}>
        <Typography className={classes.title}>{product.title}</Typography>
        <Typography className={classes.price}>
          ${Number(product.priceMin || product.price).toFixed(2)}{" "}
          {product.currency}
        </Typography>
        <Chip
          size="small"
          className={classes.stockChip}
          label={
            isAvailable
              ? `En stock (${product.totalInventory})`
              : "Agotado"
          }
          color={isAvailable ? "primary" : "default"}
          variant="outlined"
        />
      </CardContent>
      <CardActions className={classes.actions}>
        {onAddToCart && (
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<CartIcon />}
            onClick={() => onAddToCart(product)}
            disabled={!isAvailable}
          >
            Agregar
          </Button>
        )}
        {onView && product.productUrl && (
          <Button
            size="small"
            startIcon={<OpenIcon />}
            onClick={() => onView(product)}
          >
            Ver
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default ShopifyProductCard;
