import React, { useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField
} from "@material-ui/core";
import { toast } from "react-toastify";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";

const validationSchema = Yup.object().shape({
  name: Yup.string().required(),
  type: Yup.string().required(),
  status: Yup.string().required()
});

const channelTypes = [
  { value: "instagram_dm", label: "Instagram DM" },
  { value: "instagram_comment", label: "Instagram Comments" },
  { value: "facebook_messenger", label: "Facebook Messenger" },
  { value: "facebook_comment", label: "Facebook Comments" },
  { value: "whatsapp", label: "WhatsApp" }
];

const ChannelModal = ({ open, onClose, channel, onSaved }) => {
  const initialValues = useMemo(
    () => ({
      name: channel?.name || "",
      provider: channel?.provider || "",
      type: channel?.type || "",
      status: channel?.status || "active",
      externalId: channel?.externalId || "",
      accessToken: channel?.accessToken || "",
      refreshToken: channel?.refreshToken || "",
      tokenExpiresAt: channel?.tokenExpiresAt
        ? new Date(channel.tokenExpiresAt).toISOString().slice(0, 16)
        : "",
      metadata: channel?.metadata ? JSON.stringify(channel.metadata, null, 2) : ""
    }),
    [channel]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
  }, [open]);

  const handleSubmit = async (values, actions) => {
    try {
      const payload = {
        ...values,
        tokenExpiresAt: values.tokenExpiresAt || null,
        metadata: values.metadata
          ? JSON.parse(values.metadata)
          : undefined
      };

      let response;
      if (channel) {
        response = await api.put(`/channels/${channel.id}`, payload);
        toast.success(i18n.t("channels.toasts.updated"));
      } else {
        response = await api.post("/channels", payload);
        toast.success(i18n.t("channels.toasts.created"));
      }

      onSaved(response.data);
      onClose();
    } catch (err) {
      if (err instanceof SyntaxError) {
        toast.error("JSON inválido nos metadados.");
      } else {
        toastError(err);
      }
    } finally {
      actions.setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {channel
          ? i18n.t("channels.modal.editTitle")
          : i18n.t("channels.modal.addTitle")}
      </DialogTitle>
      <Formik
        initialValues={initialValues}
        enableReinitialize
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, isSubmitting, errors, touched, handleChange }) => (
          <Form>
            <DialogContent>
              <Field
                as={TextField}
                fullWidth
                margin="dense"
                name="name"
                label={i18n.t("channels.modal.name")}
                variant="outlined"
                value={values.name}
                onChange={handleChange}
                error={touched.name && Boolean(errors.name)}
                helperText={touched.name && errors.name}
              />

              <Field
                as={TextField}
                fullWidth
                margin="dense"
                name="provider"
                label={i18n.t("channels.modal.provider")}
                variant="outlined"
                value={values.provider}
                onChange={handleChange}
              />

              <Field
                as={TextField}
                select
                fullWidth
                margin="dense"
                name="type"
                label={i18n.t("channels.modal.type")}
                variant="outlined"
                value={values.type}
                onChange={handleChange}
                error={touched.type && Boolean(errors.type)}
                helperText={touched.type && errors.type}
              >
                {channelTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Field>

              <Field
                as={TextField}
                select
                fullWidth
                margin="dense"
                name="status"
                label={i18n.t("channels.modal.status")}
                variant="outlined"
                value={values.status}
                onChange={handleChange}
              >
                <MenuItem value="active">
                  {i18n.t("channels.status.active")}
                </MenuItem>
                <MenuItem value="inactive">
                  {i18n.t("channels.status.inactive")}
                </MenuItem>
              </Field>

              <Field
                as={TextField}
                fullWidth
                margin="dense"
                name="externalId"
                label={i18n.t("channels.modal.externalId")}
                variant="outlined"
                value={values.externalId}
                onChange={handleChange}
              />

              <Field
                as={TextField}
                fullWidth
                margin="dense"
                name="accessToken"
                label={i18n.t("channels.modal.accessToken")}
                variant="outlined"
                value={values.accessToken}
                onChange={handleChange}
              />

              <Field
                as={TextField}
                fullWidth
                margin="dense"
                name="refreshToken"
                label={i18n.t("channels.modal.refreshToken")}
                variant="outlined"
                value={values.refreshToken}
                onChange={handleChange}
              />

              <Field
                as={TextField}
                fullWidth
                margin="dense"
                name="tokenExpiresAt"
                label={i18n.t("channels.modal.tokenExpiresAt")}
                variant="outlined"
                type="datetime-local"
                value={values.tokenExpiresAt}
                onChange={handleChange}
                InputLabelProps={{
                  shrink: true
                }}
              />

              <Field
                as={TextField}
                fullWidth
                margin="dense"
                name="metadata"
                label={i18n.t("channels.modal.metadata")}
                variant="outlined"
                multiline
                minRows={4}
                value={values.metadata}
                onChange={handleChange}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose} color="secondary">
                {i18n.t("channels.modal.cancel")}
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting}
                variant="contained"
              >
                {i18n.t("channels.modal.save")}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

ChannelModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
  channel: PropTypes.object
};

ChannelModal.defaultProps = {
  channel: null
};

export default ChannelModal;

