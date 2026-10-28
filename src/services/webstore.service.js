import {
  findWebstoresRepo,
  findWebstoreByIdRepo,
  findWebstoreByNameRepo,
  getNextWebstoreCodeRepo,
  createWebstoreRepo,
  updateWebstoreRepo,
  toggleWebstoreStatusRepo,
  deleteWebstoreRepo,
} from "../repositories/webstore.repository.js";

export const getWebstoresService = async (userId, query = {}) => {
  return await findWebstoresRepo(userId, query);
};

export const getNextWebstoreCodeService = async (userId) => {
  const nextCode = await getNextWebstoreCodeRepo(userId);
  return { nextCode };
};

export const getWebstoreByIdService = async (id, userId) => {
  const store = await findWebstoreByIdRepo(id, userId);
  if (!store) {
    throw new Error("Webstore not found.");
  }
  return store;
};

export const createWebstoreService = async (userId, data) => {
  const existing = await findWebstoreByNameRepo(data.storeName, userId);
  if (existing) {
    throw new Error(`Webstore with name "${data.storeName}" already exists.`);
  }

  return await createWebstoreRepo(userId, data);
};

export const updateWebstoreService = async (id, userId, data) => {
  const current = await findWebstoreByIdRepo(id, userId);
  if (!current) {
    throw new Error("Webstore not found.");
  }

  if (data.storeName && data.storeName.trim() !== current.storeName) {
    const duplicate = await findWebstoreByNameRepo(data.storeName, userId);
    if (duplicate && duplicate.id !== id) {
      throw new Error(`Webstore with name "${data.storeName}" already exists.`);
    }
  }

  return await updateWebstoreRepo(id, userId, data);
};

export const toggleWebstoreStatusService = async (id, userId) => {
  return await toggleWebstoreStatusRepo(id, userId);
};

export const deleteWebstoreService = async (id, userId) => {
  const current = await findWebstoreByIdRepo(id, userId);
  if (!current) {
    throw new Error("Webstore not found.");
  }
  return await deleteWebstoreRepo(id, userId);
};

export const testSpapiConnectionService = async ({
  spClientId,
  spClientSecret,
  refreshToken,
}) => {
  if (!spClientId || !spClientSecret || !refreshToken) {
    throw new Error(
      "Client ID, Client Secret, and Refresh Token are all required to test Amazon SP-API."
    );
  }

  try {
    const axios = (await import("axios")).default;
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("client_id", spClientId.trim());
    params.append("client_secret", spClientSecret.trim());
    params.append("refresh_token", refreshToken.trim());

    const response = await axios.post(
      "https://api.amazon.com/auth/o2/token",
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        timeout: 10000,
      }
    );

    if (response.data && response.data.access_token) {
      return {
        connected: true,
        message: "Successfully verified Amazon SP-API credentials! Valid LWA token obtained.",
        tokenType: response.data.token_type,
        expiresIn: response.data.expires_in,
      };
    }

    throw new Error("Unexpected response from Amazon auth service.");
  } catch (err) {
    const amazonError =
      err.response?.data?.error_description ||
      err.response?.data?.error ||
      err.message;
    throw new Error(`Amazon SP-API verification failed: ${amazonError}`);
  }
};

