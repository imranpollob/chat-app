import httpClient from './httpClient';

export const fetchRooms = async () => {
  const { data } = await httpClient.get('/rooms');
  return data.rooms;
};

export const createRoom = async (payload) => {
  const { data } = await httpClient.post('/rooms', payload);
  return data.room;
};

export const fetchMessages = async (roomId) => {
  const { data } = await httpClient.get(`/rooms/${roomId}/messages`);
  return data.messages;
};

export const fetchRequests = async (roomId) => {
  const { data } = await httpClient.get(`/rooms/${roomId}/requests`);
  return data;
};

export const updateRequest = async (roomId, payload) => {
  const { data } = await httpClient.post(`/rooms/${roomId}/requests`, payload);
  return data;
};

export const inviteUser = async (roomId, payload) => {
  const { data } = await httpClient.post(`/rooms/${roomId}/invite`, payload);
  return data;
};
