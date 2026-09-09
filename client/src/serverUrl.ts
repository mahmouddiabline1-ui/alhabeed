const productionServerUrl = "https://alhabeed-production.up.railway.app";

export const serverUrl = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? "" : productionServerUrl);
