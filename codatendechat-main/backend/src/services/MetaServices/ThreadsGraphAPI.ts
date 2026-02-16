import axios from "axios";
import { logger } from "../../utils/logger";

const THREADS_API_URL = "https://graph.threads.net/v1.0";

interface ThreadsPublishParams {
  userId: string;
  accessToken: string;
  text: string;
  replyToId?: string;
  mediaUrl?: string;
  mediaType?: "IMAGE" | "VIDEO";
}

interface ThreadsReply {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  media_url?: string;
  media_type?: string;
}

interface ThreadsUserProfile {
  id: string;
  username: string;
  name?: string;
  threads_profile_picture_url?: string;
}

// Publish a text post or reply on Threads
export const publishThreadsPost = async ({
  userId,
  accessToken,
  text,
  replyToId,
  mediaUrl,
  mediaType
}: ThreadsPublishParams): Promise<string> => {
  try {
    // Step 1: Create media container
    const containerParams: any = {
      media_type: "TEXT",
      text,
      access_token: accessToken
    };

    // If replying to a specific thread
    if (replyToId) {
      containerParams.reply_to_id = replyToId;
    }

    // If attaching media
    if (mediaUrl && mediaType) {
      containerParams.media_type = mediaType;
      if (mediaType === "IMAGE") {
        containerParams.image_url = mediaUrl;
      } else if (mediaType === "VIDEO") {
        containerParams.video_url = mediaUrl;
      }
    }

    const containerResponse = await axios.post(
      `${THREADS_API_URL}/${userId}/threads`,
      null,
      { params: containerParams }
    );

    const containerId = containerResponse.data.id;

    // Step 2: Publish the container
    const publishResponse = await axios.post(
      `${THREADS_API_URL}/${userId}/threads_publish`,
      null,
      {
        params: {
          creation_id: containerId,
          access_token: accessToken
        }
      }
    );

    return publishResponse.data.id;
  } catch (err: any) {
    logger.error(
      `Error publishing Threads post: ${err.response?.data?.error?.message || err.message}`
    );
    throw err;
  }
};

// Get replies to a specific thread
export const getThreadReplies = async (
  threadId: string,
  accessToken: string
): Promise<ThreadsReply[]> => {
  try {
    const response = await axios.get(
      `${THREADS_API_URL}/${threadId}/replies`,
      {
        params: {
          fields: "id,text,username,timestamp,media_url,media_type",
          access_token: accessToken
        }
      }
    );
    return response.data.data || [];
  } catch (err: any) {
    logger.error(
      `Error fetching Threads replies: ${err.response?.data?.error?.message || err.message}`
    );
    return [];
  }
};

// Get conversation (nested replies) for a thread
export const getThreadConversation = async (
  threadId: string,
  accessToken: string
): Promise<ThreadsReply[]> => {
  try {
    const response = await axios.get(
      `${THREADS_API_URL}/${threadId}/conversation`,
      {
        params: {
          fields: "id,text,username,timestamp,media_url,media_type",
          access_token: accessToken
        }
      }
    );
    return response.data.data || [];
  } catch (err: any) {
    logger.error(
      `Error fetching Threads conversation: ${err.response?.data?.error?.message || err.message}`
    );
    return [];
  }
};

// Get user profile from Threads
export const getThreadsUserProfile = async (
  userId: string,
  accessToken: string
): Promise<ThreadsUserProfile> => {
  try {
    const response = await axios.get(
      `${THREADS_API_URL}/${userId}`,
      {
        params: {
          fields: "id,username,name,threads_profile_picture_url",
          access_token: accessToken
        }
      }
    );
    return response.data;
  } catch (err: any) {
    logger.warn(`Could not fetch Threads profile for ${userId}: ${err.message}`);
    return {
      id: userId,
      username: `threads_user_${userId}`
    };
  }
};

// Manage reply visibility (hide/unhide)
export const manageThreadReply = async (
  replyId: string,
  accessToken: string,
  hide: boolean
): Promise<void> => {
  try {
    await axios.post(
      `${THREADS_API_URL}/${replyId}/manage_reply`,
      null,
      {
        params: {
          hide,
          access_token: accessToken
        }
      }
    );
  } catch (err: any) {
    logger.error(
      `Error managing Threads reply: ${err.response?.data?.error?.message || err.message}`
    );
    throw err;
  }
};

// Exchange Threads OAuth code for access token
export const exchangeThreadsCode = async (
  code: string,
  appId: string,
  appSecret: string,
  redirectUri: string
): Promise<{ accessToken: string; userId: string }> => {
  // Step 1: Get short-lived token
  const tokenResponse = await axios.post(
    `${THREADS_API_URL}/oauth/access_token`,
    null,
    {
      params: {
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code
      }
    }
  );

  const shortLivedToken = tokenResponse.data.access_token;
  const userId = tokenResponse.data.user_id;

  // Step 2: Exchange for long-lived token
  const longLivedResponse = await axios.get(
    `${THREADS_API_URL}/access_token`,
    {
      params: {
        grant_type: "th_exchange_token",
        client_secret: appSecret,
        access_token: shortLivedToken
      }
    }
  );

  return {
    accessToken: longLivedResponse.data.access_token,
    userId: String(userId)
  };
};

// Refresh a long-lived Threads token
export const refreshThreadsToken = async (
  accessToken: string
): Promise<{ accessToken: string; expiresIn: number }> => {
  const response = await axios.get(
    `${THREADS_API_URL}/refresh_access_token`,
    {
      params: {
        grant_type: "th_refresh_token",
        access_token: accessToken
      }
    }
  );

  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in
  };
};
