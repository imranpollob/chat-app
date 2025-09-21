// Utility to filter discover rooms by type and user role
const filterDiscoverRooms = (rooms, type) => {
  if (!rooms || type === 'all') return rooms;
  if (type === 'public' || type === 'request') {
    return rooms.filter(room => room.type === type);
  }
  if (type === 'member') {
    return rooms.filter(room => room.isMember);
  }
  if (type === 'owner') {
    return rooms.filter(room => room.isOwner);
  }
  if (type === 'moderator') {
    return rooms.filter(room => room.isModerator);
  }
  return rooms;
};

export default filterDiscoverRooms;
