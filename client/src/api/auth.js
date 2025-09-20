import httpClient from './httpClient';

export const register = async ({ username, password }) => {
  const { data } = await httpClient.post('/auth/register', { username, password });
  return data;
};

export const login = async ({ username, password }) => {
  const { data } = await httpClient.post('/auth/login', { username, password });
  return data;
};
