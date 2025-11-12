export default {
  verifyToken: process.env.META_VERIFY_TOKEN || "",
  appSecret: process.env.META_APP_SECRET || "",
  appId: process.env.META_APP_ID || "",
  redirectUri: process.env.META_REDIRECT_URI || "",
  apiVersion: process.env.META_API_VERSION || "v17.0",
  stateSecret: process.env.META_STATE_SECRET || process.env.JWT_SECRET || "",
  postConnectRedirect:
    process.env.META_POST_CONNECT_REDIRECT ||
    `${process.env.FRONTEND_URL || ""}/channels`
};

