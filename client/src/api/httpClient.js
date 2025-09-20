import axios from 'axios';

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(
        `API error: ${error.response.status} ${error.response.statusText}`,
        error.response.data
      );
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token) => {
  if (token) {
    httpClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete httpClient.defaults.headers.common.Authorization;
  }
};

export default httpClient;
