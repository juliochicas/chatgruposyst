import axios from "axios";
import { logger } from "../../utils/logger";

const GRAPH_API_URL = "https://graph.facebook.com/v21.0";

interface SendMessageParams {
  recipientId: string;
  message: string;
  pageAccessToken: string;
  pageId?: string;
  instagramAccountId?: string;
  channel: "facebook" | "instagram";
  mediaUrl?: string;
  mediaType?: string;
}

interface SendCommentReplyParams {
  commentId: string;
  message: string;
  pageAccessToken: string;
}

interface MetaUserProfile {
  id: string;
  name: string;
  profilePic?: string;
}

// Send message via Facebook Messenger or Instagram DM
export const sendMetaMessage = async ({
  recipientId,
  message,
  pageAccessToken,
  pageId,
  instagramAccountId,
  channel,
  mediaUrl,
  mediaType
}: SendMessageParams): Promise<string> => {
  try {
    let endpoint: string;
    let payload: any;

    if (channel === "facebook") {
      endpoint = `${GRAPH_API_URL}/${pageId}/messages`;
      payload = {
        recipient: { id: recipientId },
        messaging_type: "RESPONSE",
        message: mediaUrl
          ? {
              attachment: {
                type: mediaType || "image",
                payload: { url: mediaUrl, is_reusable: true }
              }
            }
          : { text: message }
      };
    } else {
      // Instagram
      endpoint = `${GRAPH_API_URL}/${instagramAccountId}/messages`;
      payload = {
        recipient: { id: recipientId },
        message: mediaUrl
          ? {
              attachment: {
                type: mediaType || "image",
                payload: { url: mediaUrl }
              }
            }
          : { text: message }
      };
    }

    const response = await axios.post(endpoint, payload, {
      params: { access_token: pageAccessToken }
    });

    return response.data.message_id || response.data.id;
  } catch (err: any) {
    logger.error(
      `Error sending ${channel} message: ${err.response?.data?.error?.message || err.message}`
    );
    throw err;
  }
};

// Reply to a comment on Facebook or Instagram
export const replyToComment = async ({
  commentId,
  message,
  pageAccessToken
}: SendCommentReplyParams): Promise<string> => {
  try {
    const response = await axios.post(
      `${GRAPH_API_URL}/${commentId}/replies`,
      { message },
      { params: { access_token: pageAccessToken } }
    );
    return response.data.id;
  } catch (err: any) {
    logger.error(
      `Error replying to comment: ${err.response?.data?.error?.message || err.message}`
    );
    throw err;
  }
};

// Get user profile from Meta
export const getMetaUserProfile = async (
  userId: string,
  accessToken: string,
  channel: "facebook" | "instagram"
): Promise<MetaUserProfile> => {
  try {
    if (channel === "facebook") {
      const response = await axios.get(`${GRAPH_API_URL}/${userId}`, {
        params: {
          fields: "name,profile_pic",
          access_token: accessToken
        }
      });
      return {
        id: response.data.id,
        name: response.data.name || `FB User ${userId}`,
        profilePic: response.data.profile_pic
      };
    } else {
      // Instagram - user info may be limited
      const response = await axios.get(`${GRAPH_API_URL}/${userId}`, {
        params: {
          fields: "name,username,profile_picture_url",
          access_token: accessToken
        }
      });
      return {
        id: response.data.id,
        name: response.data.name || response.data.username || `IG User ${userId}`,
        profilePic: response.data.profile_picture_url
      };
    }
  } catch (err: any) {
    logger.warn(`Could not fetch profile for ${userId}: ${err.message}`);
    return {
      id: userId,
      name: `User ${userId}`,
      profilePic: undefined
    };
  }
};

// Subscribe a page to webhook events
export const subscribePageToWebhook = async (
  pageId: string,
  pageAccessToken: string
): Promise<void> => {
  try {
    await axios.post(
      `${GRAPH_API_URL}/${pageId}/subscribed_apps`,
      {
        subscribed_fields: [
          "messages",
          "messaging_postbacks",
          "messaging_optins",
          "message_deliveries",
          "message_reads",
          "feed"
        ].join(",")
      },
      { params: { access_token: pageAccessToken } }
    );
    logger.info(`Page ${pageId} subscribed to webhook events`);
  } catch (err: any) {
    logger.error(
      `Error subscribing page ${pageId}: ${err.response?.data?.error?.message || err.message}`
    );
    throw err;
  }
};

// Exchange short-lived token for long-lived token
export const exchangeForLongLivedToken = async (
  shortLivedToken: string,
  appId: string,
  appSecret: string
): Promise<{ accessToken: string; expiresIn: number }> => {
  const response = await axios.get(`${GRAPH_API_URL}/oauth/access_token`, {
    params: {
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedToken
    }
  });
  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in
  };
};

// Get pages managed by user
export const getUserPages = async (
  userAccessToken: string
): Promise<Array<{ id: string; name: string; access_token: string }>> => {
  const response = await axios.get(`${GRAPH_API_URL}/me/accounts`, {
    params: {
      access_token: userAccessToken,
      fields: "id,name,access_token"
    }
  });
  return response.data.data;
};

// Get Instagram Business Account linked to a page
export const getInstagramAccount = async (
  pageId: string,
  pageAccessToken: string
): Promise<{ id: string; username: string } | null> => {
  try {
    const response = await axios.get(
      `${GRAPH_API_URL}/${pageId}`,
      {
        params: {
          fields: "instagram_business_account{id,username}",
          access_token: pageAccessToken
        }
      }
    );
    if (response.data.instagram_business_account) {
      return {
        id: response.data.instagram_business_account.id,
        username: response.data.instagram_business_account.username
      };
    }
    return null;
  } catch (err: any) {
    logger.warn(`No Instagram business account for page ${pageId}: ${err.message}`);
    return null;
  }
};

// Download media from Meta (for incoming attachments)
export const downloadMetaMedia = async (
  mediaUrl: string,
  accessToken: string
): Promise<Buffer> => {
  const response = await axios.get(mediaUrl, {
    params: { access_token: accessToken },
    responseType: "arraybuffer"
  });
  return Buffer.from(response.data);
};
