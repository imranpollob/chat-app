import httpClient from './httpClient';

export const fetchRooms = async () => {
  const { data } = await httpClient.get('/rooms');
  return data.rooms;
};

export const fetchJoinedRooms = async ({ search } = {}) => {
  const params = new URLSearchParams();
  if (search) {
    params.set('search', search);
  }
  const query = params.toString();
  const { data } = await httpClient.get(`/rooms/joined${query ? `?${query}` : ''}`);
  return data.rooms;
};

export const fetchDiscoverRooms = async ({ search, type } = {}) => {
  const params = new URLSearchParams();
  if (search) {
    params.set('search', search);
  }
  if (type && ['public', 'request'].includes(type)) {
    params.set('type', type);
  }
  const query = params.toString();
  const { data } = await httpClient.get(`/rooms/discover${query ? `?${query}` : ''}`);
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

export const fetchRoomMembers = async (roomId) => {
  const { data } = await httpClient.get(`/rooms/${roomId}/members`);
  return data;
};

export const updateRoomMember = async (roomId, payload) => {
  const { data } = await httpClient.post(`/rooms/${roomId}/members`, payload);
  return data;
};

export const leaveRoom = async (roomId) => {
  const { data } = await httpClient.post(`/rooms/${roomId}/leave`);
  return data;
};
