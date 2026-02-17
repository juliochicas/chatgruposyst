import React, { useState, useEffect } from "react";
import { Chip, makeStyles, Divider, Typography } from "@material-ui/core";
import { i18n } from "../../translate/i18n";
import OutlinedDiv from "../OutlinedDiv";
import api from "../../services/api";

const useStyles = makeStyles(theme => ({
    chip: {
        margin: theme.spacing(0.5),
        cursor: "pointer"
    },
    customChip: {
        margin: theme.spacing(0.5),
        cursor: "pointer",
    },
    divider: {
        margin: theme.spacing(0.5, 0),
        width: "100%",
    },
    sectionLabel: {
        fontSize: "0.65rem",
        color: theme.palette.text.secondary,
        margin: theme.spacing(0.5),
    },
}));

const MessageVariablesPicker = ({ onClick, disabled }) => {
    const classes = useStyles();
    const [customVars, setCustomVars] = useState([]);

    useEffect(() => {
        const loadCustomVars = async () => {
            try {
                const { data } = await api.get("/message-variables");
                setCustomVars(data);
            } catch (err) {
                // silently ignore if endpoint not available
            }
        };
        loadCustomVars();
    }, []);

    const handleClick = (e, value) => {
        e.preventDefault();
        if (disabled) return;
        onClick(value);
    };

    const builtInVars = [
        {
            name: i18n.t("messageVariablesPicker.vars.contactFirstName"),
            value: "{{firstName}}"
        },
        {
            name: i18n.t("messageVariablesPicker.vars.contactName"),
            value: "{{name}} "
        },
        {
            name: i18n.t("messageVariablesPicker.vars.greeting"),
            value: "{{ms}} "
        },
        {
            name: i18n.t("messageVariablesPicker.vars.protocolNumber"),
            value: "{{protocol}} "
        },
        {
            name: i18n.t("messageVariablesPicker.vars.hour"),
            value: "{{hora}} "
        },
        {
            name: i18n.t("messageVariablesPicker.vars.date"),
            value: "{{fecha}} "
        },
        {
            name: i18n.t("messageVariablesPicker.vars.phoneNumber"),
            value: "{{phoneNumber}} "
        },
        {
            name: i18n.t("messageVariablesPicker.vars.email"),
            value: "{{email}} "
        },
        {
            name: i18n.t("messageVariablesPicker.vars.companyName"),
            value: "{{companyName}} "
        },
    ];

    return (
        <OutlinedDiv
            margin="dense"
            fullWidth
            label={i18n.t("messageVariablesPicker.label")}
            disabled={disabled}
        >
            {builtInVars.map(msgVar => (
                <Chip
                    key={msgVar.value}
                    onMouseDown={e => handleClick(e, msgVar.value)}
                    label={msgVar.name}
                    size="small"
                    className={classes.chip}
                    color="primary"
                />
            ))}
            {customVars.length > 0 && (
                <>
                    <Divider className={classes.divider} />
                    <Typography className={classes.sectionLabel}>
                        {i18n.t("messageVariablesPicker.customLabel")}
                    </Typography>
                    {customVars.map(v => (
                        <Chip
                            key={v.key}
                            onMouseDown={e => handleClick(e, `{{${v.key}}} `)}
                            label={v.label}
                            size="small"
                            className={classes.customChip}
                            color="secondary"
                        />
                    ))}
                </>
            )}
        </OutlinedDiv>
    );
};

export default MessageVariablesPicker;
