import React, { useState, useEffect } from 'react';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import Grid from '@material-ui/core/Grid';
import StarIcon from '@material-ui/icons/StarBorder';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';

import IconButton from '@material-ui/core/IconButton';
import RemoveIcon from '@material-ui/icons/Remove';
import AddIcon from '@material-ui/icons/Add';
import Switch from '@material-ui/core/Switch';
import Chip from '@material-ui/core/Chip';

import usePlans from "../../../hooks/usePlans";
import useCompanies from "../../../hooks/useCompanies";
import { i18n } from '../../../translate/i18n';

const useStyles = makeStyles((theme) => ({
  '@global': {
    ul: {
      margin: 0,
      padding: 0,
      listStyle: 'none',
    },
  },
  cardHeader: {
    backgroundColor:
      theme.palette.type === 'light' ? theme.palette.grey[200] : theme.palette.grey[700],
  },
  featuredHeader: {
    backgroundColor: theme.palette.primary.main,
    color: '#fff',
  },
  cardPricing: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: theme.spacing(2),
  },
  toggleWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
    gap: theme.spacing(1),
  },
  discountBadge: {
    backgroundColor: '#4caf50',
    color: '#fff',
    fontWeight: 'bold',
  },
  qtyControl: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  qtyLabel: {
    minWidth: 120,
    textAlign: 'right',
    marginRight: theme.spacing(1),
  },
  qtyValue: {
    fontWeight: 'bold',
    minWidth: 30,
    textAlign: 'center',
  },
  selectedCard: {
    border: `2px solid ${theme.palette.primary.main}`,
  },
}));


export default function PaymentForm(props) {
  const {
    setFieldValue,
    setActiveStep,
    activeStep,
  } = props;

  const { list: listPlans } = usePlans();
  const { find } = useCompanies();

  const classes = useStyles();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(null);

  // Custom plan adjustments
  const [customUsers, setCustomUsers] = useState(3);
  const [customConnections, setCustomConnections] = useState(1);

  const companyId = localStorage.getItem("companyId");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Load company to know current plan
        const company = await find(companyId);
        setCurrentPlanId(company.planId);

        // Load all plans
        const allPlans = await listPlans();
        if (Array.isArray(allPlans)) {
          setPlans(allPlans);

          // Set custom plan defaults from the custom plan
          const customPlan = allPlans.find(p => p.isCustom);
          if (customPlan) {
            setCustomUsers(customPlan.users || 3);
            setCustomConnections(customPlan.connections || 1);
          }
        }
      } catch (e) {
        console.log(e);
      }
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line

  const calculatePrice = (plan) => {
    let monthly = plan.value;

    if (plan.isCustom) {
      const baseUsers = plan.users || 3;
      const baseConns = plan.connections || 1;
      const extraU = Math.max(0, customUsers - baseUsers);
      const extraC = Math.max(0, customConnections - baseConns);
      monthly += extraU * 13 + extraC * 20;
    }

    if (isAnnual) {
      return Math.round(monthly * 12 * 0.8);
    }
    return monthly;
  };

  const handleSelectPlan = (plan) => {
    const payload = {
      planId: plan.id,
      recurrence: isAnnual ? "annual" : "monthly",
      users: plan.isCustom ? customUsers : plan.users,
      connections: plan.isCustom ? customConnections : plan.connections,
    };
    setFieldValue("plan", JSON.stringify(payload));
    setActiveStep(activeStep + 1);
  };

  const handleUsersChange = (delta) => {
    setCustomUsers(prev => Math.max(1, prev + delta));
  };

  const handleConnectionsChange = (delta) => {
    setCustomConnections(prev => Math.max(1, prev + delta));
  };

  if (loading) {
    return (
      <Typography variant="h6" align="center" style={{ padding: 32 }}>
        Cargando planes...
      </Typography>
    );
  }

  return (
    <React.Fragment>
      {/* Monthly / Annual toggle */}
      <div className={classes.toggleWrap}>
        <Typography variant="body1" style={{ fontWeight: !isAnnual ? 'bold' : 'normal' }}>
          Mensual
        </Typography>
        <Switch
          checked={isAnnual}
          onChange={() => setIsAnnual(!isAnnual)}
          color="primary"
        />
        <Typography variant="body1" style={{ fontWeight: isAnnual ? 'bold' : 'normal' }}>
          Anual
        </Typography>
        {isAnnual && (
          <Chip label="-20%" className={classes.discountBadge} size="small" />
        )}
      </div>

      <Grid container spacing={3} justifyContent="center">
        {plans
          .filter(p => p.isPublic !== false)
          .map((plan) => (
            <Grid item key={plan.id} xs={12} sm={6} md={6}>
              <Card className={currentPlanId === plan.id ? classes.selectedCard : ''}>
                <CardHeader
                  title={plan.name}
                  subheader={plan.isFeatured ? "MÁS POPULAR" : (plan.isCustom ? "A tu medida" : "")}
                  titleTypographyProps={{ align: 'center' }}
                  subheaderTypographyProps={{ align: 'center', style: plan.isFeatured ? { color: '#fff' } : {} }}
                  action={plan.isFeatured ? <StarIcon style={{ color: '#fff' }} /> : null}
                  className={plan.isFeatured ? classes.featuredHeader : classes.cardHeader}
                />
                <CardContent>
                  <div className={classes.cardPricing}>
                    <Typography component="h2" variant="h3" color="textPrimary">
                      ${calculatePrice(plan).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </Typography>
                    <Typography variant="h6" color="textSecondary">
                      /{isAnnual ? "año" : "mes"}
                    </Typography>
                  </div>

                  {plan.description && (
                    <Typography variant="subtitle1" align="center" color="textSecondary" style={{ marginBottom: 8 }}>
                      {plan.description}
                    </Typography>
                  )}

                  {/* Custom plan +/- controls */}
                  {plan.isCustom && (
                    <div style={{ marginBottom: 16 }}>
                      <div className={classes.qtyControl}>
                        <Typography className={classes.qtyLabel} variant="body2">
                          Usuarios:
                        </Typography>
                        <IconButton size="small" onClick={() => handleUsersChange(-1)} disabled={customUsers <= 1}>
                          <RemoveIcon />
                        </IconButton>
                        <Typography className={classes.qtyValue}>{customUsers}</Typography>
                        <IconButton size="small" onClick={() => handleUsersChange(1)}>
                          <AddIcon />
                        </IconButton>
                        <Typography variant="caption" color="textSecondary">
                          (+$13/u)
                        </Typography>
                      </div>
                      <div className={classes.qtyControl}>
                        <Typography className={classes.qtyLabel} variant="body2">
                          Conexiones:
                        </Typography>
                        <IconButton size="small" onClick={() => handleConnectionsChange(-1)} disabled={customConnections <= 1}>
                          <RemoveIcon />
                        </IconButton>
                        <Typography className={classes.qtyValue}>{customConnections}</Typography>
                        <IconButton size="small" onClick={() => handleConnectionsChange(1)}>
                          <AddIcon />
                        </IconButton>
                        <Typography variant="caption" color="textSecondary">
                          (+$20/c)
                        </Typography>
                      </div>
                    </div>
                  )}

                  {/* Feature list */}
                  {plan.features && Array.isArray(plan.features) && (
                    <ul>
                      {plan.features.map((feature, idx) => (
                        <Typography component="li" variant="subtitle1" align="center" key={idx}>
                          {feature}
                        </Typography>
                      ))}
                    </ul>
                  )}

                  {(!plan.features || !Array.isArray(plan.features)) && (
                    <ul>
                      <Typography component="li" variant="subtitle1" align="center">
                        {plan.users} {i18n.t("checkoutPage.pricing.users")}
                      </Typography>
                      <Typography component="li" variant="subtitle1" align="center">
                        {plan.connections} {i18n.t("checkoutPage.pricing.connection")}
                      </Typography>
                      {plan.queues > 0 && (
                        <Typography component="li" variant="subtitle1" align="center">
                          {plan.queues} {i18n.t("checkoutPage.pricing.queues")}
                        </Typography>
                      )}
                    </ul>
                  )}
                </CardContent>
                <CardActions>
                  <Button
                    fullWidth
                    variant={plan.isFeatured ? "contained" : "outlined"}
                    color="primary"
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {currentPlanId === plan.id
                      ? "Plan Actual"
                      : (i18n.t("checkoutPage.pricing.SELECT") || "Seleccionar")
                    }
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
      </Grid>
    </React.Fragment>
  );
}
