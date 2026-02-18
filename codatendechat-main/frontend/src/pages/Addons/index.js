import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import { toast } from "react-toastify";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
    root: {
        flexGrow: 1,
        padding: theme.spacing(2),
    },
    card: {
        minWidth: 275,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
    },
    title: {
        fontSize: 14,
    },
    pos: {
        marginBottom: 12,
    },
    price: {
        marginTop: 10,
        fontWeight: "bold",
        fontSize: "1.2rem",
    },
}));

const Addons = () => {
    const classes = useStyles();
    const history = useHistory();
    const [addons, setAddons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [userAddons, setUserAddons] = useState([]);

    useEffect(() => {
        fetchAddons();
        fetchUserAddons();

        // Check for success param from Stripe redirect
        const params = new URLSearchParams(window.location.hash.split("?")[1]);
        if (params.get("success") === "true") {
            toast.success(i18n.t("addons.purchaseSuccess") || "Add-on activated successfully!");
            // Clean URL
            history.replace("/addons");
        }
    }, []);

    const fetchAddons = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/addons");
            setAddons(data);
        } catch (err) {
            toastError(err);
        }
        setLoading(false);
    };

    const fetchUserAddons = async () => {
        try {
            const { data } = await api.get("/company-addons");
            setUserAddons(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubscribe = async (addon) => {
        try {
            const { data } = await api.post("/company-addons/subscribe", {
                addonId: addon.id,
            });

            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.success("Add-on activated!");
                fetchUserAddons();
            }
        } catch (err) {
            toastError(err);
        }
    };

    const isActive = (addon) => {
        return userAddons.some((ua) => ua.addonId === addon.id && ua.status === "active");
    };

    return (
        <MainContainer>
            <MainHeader>
                <Title>{i18n.t("addons.title") || "Add-ons"}</Title>
            </MainHeader>

            <div className={classes.root}>
                <Grid container spacing={3}>
                    {addons.length === 0 && !loading && (
                        <Typography variant="body1">No add-ons available at the moment.</Typography>
                    )}

                    {addons.map((addon) => (
                        <Grid item xs={12} sm={6} md={4} key={addon.id}>
                            <Card className={classes.card}>
                                <CardContent>
                                    <Typography variant="h5" component="h2">
                                        {addon.name}
                                    </Typography>
                                    <Typography className={classes.pos} color="textSecondary">
                                        {addon.featureKey}
                                    </Typography>
                                    <Typography variant="body2" component="p">
                                        {addon.description}
                                    </Typography>
                                    <Typography className={classes.price} color="primary">
                                        {addon.billingType === "monthly"
                                            ? `$${addon.monthlyPrice}/mo`
                                            : `$${addon.oneTimePrice} one-time`}
                                    </Typography>
                                </CardContent>
                                <CardActions>
                                    {isActive(addon) ? (
                                        <Button size="small" variant="contained" disabled>
                                            {i18n.t("addons.active") || "Active"}
                                        </Button>
                                    ) : (
                                        <Button
                                            size="small"
                                            variant="contained"
                                            color="primary"
                                            onClick={() => handleSubscribe(addon)}
                                        >
                                            {i18n.t("addons.buy") || "Buy Now"}
                                        </Button>
                                    )}
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </div>
        </MainContainer>
    );
};

export default Addons;
