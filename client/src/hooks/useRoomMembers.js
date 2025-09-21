import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchRoomMembers, updateRoomMember } from '../api/rooms';

export default function useRoomMembers({ roomId, canLoad, onAfterMemberUpdate } = {}) {
  const [roomMembers, setRoomMembers] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberPermissions, setMemberPermissions] = useState({
    canManage: false,
    canPromote: false,
    currentRole: 'member',
  });

  const reset = useCallback(() => {
    setRoomMembers([]);
    setBannedUsers([]);
    setMemberPermissions({ canManage: false, canPromote: false, currentRole: 'member' });
  }, []);

  const loadMembers = useCallback(async (id) => {
    const targetId = id ?? roomId;
    if (!targetId) return;
    try {
      setMembersLoading(true);
      const data = await fetchRoomMembers(targetId);
      setRoomMembers(data.members || []);
      setBannedUsers(data.banned || []);
      setMemberPermissions({
        canManage: Boolean(data.permissions?.canManage),
        canPromote: Boolean(data.permissions?.canPromote),
        currentRole: data.permissions?.currentRole || 'member',
      });
    } catch (error) {
      const status = error.response?.status;
      if (status !== 403) {
        const message = error.response?.data?.message || 'Failed to load members';
        toast.error(message);
      }
      reset();
    } finally {
      setMembersLoading(false);
    }
  }, [reset, roomId]);

  const memberAction = useCallback(
    async (targetUserId, action) => {
      if (!roomId) return;
      try {
        const data = await updateRoomMember(roomId, { userId: targetUserId, action });
        toast.success(data.message);
        setRoomMembers(data.members || []);
        setBannedUsers(data.banned || []);
        setMemberPermissions({
          canManage: Boolean(data.permissions?.canManage),
          canPromote: Boolean(data.permissions?.canPromote),
          currentRole: data.permissions?.currentRole || 'member',
        });
        if (typeof onAfterMemberUpdate === 'function') {
          onAfterMemberUpdate({ roomId, action });
        }
      } catch (error) {
        const message = error.response?.data?.message || 'Unable to update member';
        toast.error(message);
      }
    },
    [roomId, onAfterMemberUpdate]
  );

  useEffect(() => {
    if (!canLoad) {
      reset();
      return;
    }
    loadMembers(roomId);
  }, [roomId, canLoad, loadMembers, reset]);

  return {
    roomMembers,
    bannedUsers,
    membersLoading,
    memberPermissions,
    loadMembers,
    memberAction,
  };
}
