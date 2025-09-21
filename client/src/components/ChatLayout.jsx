import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Dialog, Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  MoonIcon,
  SunIcon,
  PlusIcon,
  UserPlusIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  GlobeAltIcon,
  UserGroupIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import clsx from 'clsx';
import {
  createRoom,
  fetchMessages,
  fetchRequests,
  fetchJoinedRooms,
  fetchDiscoverRooms,
  inviteUser,
  updateRequest,
  fetchRoomMembers,
  updateRoomMember
} from '../api/rooms';
import useAuth from '../hooks/useAuth';
import useSocket from '../hooks/useSocket';
import useTheme from '../hooks/useTheme';

dayjs.extend(relativeTime);

const roomTypes = [
  {
    value: 'public',
    label: 'Public',
    description: 'Visible to everyone. Anyone can join instantly.'
  },
  {
    value: 'request',
    label: 'Request to Join',
    description: 'Visible to everyone. Owner approval required before joining.'
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Hidden from discovery. Only invited users can join.'
  }
];

const defaultRoomForm = {
  name: '',
  description: '',
  type: 'public'
};

const defaultDiscoverFilter = {
  search: '',
  type: 'all'
};

const ChatLayout = () => {
  const { user, logout } = useAuth();
  const { socket, status: socketStatus, isReady } = useSocket();
  const { isDark, toggleTheme } = useTheme();

  const [activeView, setActiveView] = useState('home');

  const [joinedRooms, setJoinedRooms] = useState([]);
  const [joinedLoading, setJoinedLoading] = useState(true);
  const [joinedSearch, setJoinedSearch] = useState('');
  const [activeRoomId, setActiveRoomId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [pendingState, setPendingState] = useState(false);
  const messagesContainerRef = useRef(null);

  const [roomRequests, setRoomRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [createRoomForm, setCreateRoomForm] = useState(defaultRoomForm);
  const [creatingRoom, setCreatingRoom] = useState(false);

  const [inviteUsername, setInviteUsername] = useState('');
  const [inviting, setInviting] = useState(false);

  const [roomMembers, setRoomMembers] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberPermissions, setMemberPermissions] = useState({
    canManage: false,
    canPromote: false,
    currentRole: 'member'
  });

  const [discoverRooms, setDiscoverRooms] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverSearchInput, setDiscoverSearchInput] = useState('');
  const [discoverTypeInput, setDiscoverTypeInput] = useState('all');
  const [discoverFilter, setDiscoverFilter] = useState(() => ({ ...defaultDiscoverFilter }));
  const discoverFilterRef = useRef({ ...defaultDiscoverFilter });
  const [selectedDiscoverRoom, setSelectedDiscoverRoom] = useState(null);
  const [joiningRoomId, setJoiningRoomId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const activeRoom = useMemo(
    () => joinedRooms.find((room) => room.id === activeRoomId) || null,
    [joinedRooms, activeRoomId]
  );
  const isOwner = Boolean(activeRoom?.isOwner);
  const isModerator = Boolean(activeRoom?.isModerator);
  const activeRoomType = activeRoom?.type || null;
  const avatarInitial = useMemo(() => user?.username?.[0]?.toUpperCase() || 'U', [user?.username]);
  const connectionLabel = useMemo(() => {
    if (socketStatus === 'connected') return 'Online';
    if (socketStatus === 'error') return 'Error';
    return 'Offline';
  }, [socketStatus]);
  const canManageMembers = memberPermissions.canManage;
  const canPromoteMembers = memberPermissions.canPromote;
  const currentRoomRole = memberPermissions.currentRole;

  const filteredJoinedRooms = useMemo(() => {
    if (!joinedSearch.trim()) {
      return joinedRooms;
    }
    const query = joinedSearch.trim().toLowerCase();
    return joinedRooms.filter((room) => room.name.toLowerCase().includes(query));
  }, [joinedRooms, joinedSearch]);

  const loadJoinedRooms = useCallback(async ({ focusRoomId } = {}) => {
    try {
      setJoinedLoading(true);
      const data = await fetchJoinedRooms();
      setJoinedRooms(data);
      setActiveRoomId((current) => {
        if (focusRoomId && data.some((room) => room.id === focusRoomId)) {
          return focusRoomId;
        }
        if (current && data.some((room) => room.id === current)) {
          return current;
        }
        return null;
      });
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load rooms';
      toast.error(message);
      setJoinedRooms([]);
      setActiveRoomId(null);
    } finally {
      setJoinedLoading(false);
    }
  }, []);

  const loadDiscoverRooms = useCallback(async (params = defaultDiscoverFilter) => {
    const { search = '', type = 'all' } = params;
    try {
      setDiscoverLoading(true);
      const data = await fetchDiscoverRooms({
        search: search.trim() || undefined,
        type: type === 'all' ? undefined : type
      });
      setDiscoverRooms(data);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load rooms';
      toast.error(message);
      setDiscoverRooms([]);
    } finally {
      setDiscoverLoading(false);
    }
  }, []);

  const loadMembers = useCallback(
    async (roomId) => {
      if (!roomId) return;
      try {
        setMembersLoading(true);
        const data = await fetchRoomMembers(roomId);
        setRoomMembers(data.members || []);
        setBannedUsers(data.banned || []);
        setMemberPermissions({
          canManage: Boolean(data.permissions?.canManage),
          canPromote: Boolean(data.permissions?.canPromote),
          currentRole: data.permissions?.currentRole || 'member'
        });
      } catch (error) {
        const status = error.response?.status;
        if (status !== 403) {
          const message = error.response?.data?.message || 'Failed to load members';
          toast.error(message);
        }
        setRoomMembers([]);
        setBannedUsers([]);
        setMemberPermissions({ canManage: false, canPromote: false, currentRole: 'member' });
      } finally {
        setMembersLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    discoverFilterRef.current = discoverFilter;
  }, [discoverFilter]);

  const loadMessages = useCallback(async (roomId) => {
    if (!roomId) return;
    try {
      setMessagesLoading(true);
      const data = await fetchMessages(roomId);
      setMessages(
        data.map((message) => ({
          id: message.id,
          type: 'message',
          text: message.text,
          username: message.username,
          timestamp: message.timestamp,
          roomId
        }))
      );
      setPendingState(false);
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to load messages for this room';
      setMessages([]);
      setPendingState(true);
      toast.error(message);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const handleSelectRoom = (roomId) => {
    setActiveView('home');
    setActiveRoomId(roomId);
    closeSidebar();
  };

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    if (!createRoomForm.name.trim()) {
      toast.error('Room name is required');
      return;
    }

    setCreatingRoom(true);
    try {
      const newRoom = await createRoom({ ...createRoomForm, name: createRoomForm.name.trim() });
      toast.success('Room created');
      setJoinedRooms((previous) => {
        const next = [...previous, newRoom];
        return next
          .slice()
          .sort((a, b) => new Date(b.lastActivity || b.createdAt) - new Date(a.lastActivity || a.createdAt));
      });
      setActiveRoomId(newRoom.id);
      setIsCreateRoomOpen(false);
      setCreateRoomForm(defaultRoomForm);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create room';
      toast.error(message);
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleRequestAction = async (requestId, action) => {
    if (!activeRoomId) return;
    try {
      const response = await updateRequest(activeRoomId, { userId: requestId, action });
      toast.success(response.message);
      await loadJoinedRooms({ focusRoomId: activeRoomId });
      const refreshed = await fetchRequests(activeRoomId);
      setRoomRequests(refreshed.requests || []);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update request';
      toast.error(message);
    }
  };

  const handleInvite = async (event) => {
    event.preventDefault();
    if (!isOwner) {
      toast.error('Only the room owner can invite users.');
      return;
    }
    if (!inviteUsername.trim()) {
      toast.error('Enter a username to invite');
      return;
    }

    try {
      setInviting(true);
      const response = await inviteUser(activeRoomId, { username: inviteUsername.trim() });
      toast.success(response.message);
      setInviteUsername('');
      await loadJoinedRooms({ focusRoomId: activeRoomId });
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to invite user';
      toast.error(message);
    } finally {
      setInviting(false);
    }
  };

  const handleMemberAction = async (targetUserId, action) => {
    if (!activeRoomId) return;
    try {
      const data = await updateRoomMember(activeRoomId, { userId: targetUserId, action });
      toast.success(data.message);
      setRoomMembers(data.members || []);
      setBannedUsers(data.banned || []);
      setMemberPermissions({
        canManage: Boolean(data.permissions?.canManage),
        canPromote: Boolean(data.permissions?.canPromote),
        currentRole: data.permissions?.currentRole || 'member'
      });
      await loadJoinedRooms({ focusRoomId: activeRoomId });
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to update member';
      toast.error(message);
    }
  };

  const scrollMessagesToBottom = useCallback((behavior = 'smooth', force = false) => {
    const element = messagesContainerRef.current;
    if (!element) return;

    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    const isNearBottom = distanceFromBottom < 96;

    if (!force && !isNearBottom) {
      return;
    }

    element.scrollTo({ top: element.scrollHeight, behavior });
  }, []);

  const handleMessageSubmit = (event) => {
    event.preventDefault();
    if (!socket || !isReady || !activeRoomId) {
      toast.error('You must join a room before sending messages');
      return;
    }

    const formData = new FormData(event.target);
    const text = formData.get('message');
    if (!text?.trim()) return;

    socket.emit('chatMessage', { roomId: activeRoomId, text: text.trim() }, (response) => {
      if (response?.status === 'error') {
        toast.error(response.message || 'Failed to send message');
      }
    });

    event.target.reset();
  };

  const handleDiscoverSearch = (event) => {
    event.preventDefault();
    const nextFilter = {
      search: discoverSearchInput.trim(),
      type: discoverTypeInput
    };
    setDiscoverFilter(nextFilter);
  };

  const handleResetDiscover = () => {
    setDiscoverSearchInput('');
    setDiscoverTypeInput('all');
    setDiscoverFilter({ ...defaultDiscoverFilter });
  };

  const handleDiscoverAction = (room) => {
    if (!socket || !isReady) {
      toast.error('Connection is not ready. Please try again in a moment.');
      return;
    }

    setJoiningRoomId(room.id);
    socket.emit('joinRoom', { roomId: room.id }, async (response) => {
      setJoiningRoomId(null);
      if (!response || response.status === 'joined') {
        toast.success('Joined room successfully');
        await loadJoinedRooms({ focusRoomId: room.id });
        await loadDiscoverRooms(discoverFilterRef.current);
        setSelectedDiscoverRoom(null);
        setActiveView('home');
      } else if (response.status === 'pending') {
        toast('Join request sent to the room owner.');
        await loadDiscoverRooms(discoverFilterRef.current);
        await loadJoinedRooms();
        setSelectedDiscoverRoom(null);
      } else {
        toast.error(response.message || 'Unable to join room');
      }
    });
  };

  useEffect(() => {
    loadJoinedRooms();
  }, [loadJoinedRooms]);

  useEffect(() => {
    if (activeView !== 'home') {
      setIsSidebarOpen(false);
    }
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'discover') return;
    loadDiscoverRooms(discoverFilter);
  }, [activeView, discoverFilter, loadDiscoverRooms]);

  useEffect(() => {
    if (!activeRoomId || activeView !== 'home' || !(isOwner || isModerator)) {
      setRoomMembers([]);
      setBannedUsers([]);
      setMemberPermissions({ canManage: false, canPromote: false, currentRole: 'member' });
      return;
    }
    loadMembers(activeRoomId);
  }, [activeRoomId, activeView, isOwner, isModerator, loadMembers]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleIncomingMessage = (payload) => {
      if (!payload) return;
      setJoinedRooms((previous) => {
        let updated = false;
        const next = previous.map((room) => {
          if (room.id !== payload.roomId) {
            return room;
          }
          updated = true;
          return {
            ...room,
            lastMessage: {
              id: payload.id,
              text: payload.text,
              timestamp: payload.timestamp,
              sender: payload.username
            },
            lastActivity: payload.timestamp
          };
        });

        if (!updated) {
          return previous;
        }

        return next
          .slice()
          .sort((a, b) => new Date(b.lastActivity || b.createdAt) - new Date(a.lastActivity || a.createdAt));
      });

      if (payload.roomId !== activeRoomId) {
        return;
      }

      setMessages((previous) => [
        ...previous,
        {
          id: payload.id,
          type: 'message',
          text: payload.text,
          username: payload.username,
          timestamp: payload.timestamp,
          roomId: payload.roomId
        }
      ]);
    };

    const handleUserEvent = (payload) => {
      if (!payload) return;
      setMessages((previous) => {
        if (payload.roomId !== activeRoomId) {
          return previous;
        }
        const eventId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;
        return [
          ...previous,
          {
            id: eventId,
            type: 'event',
            text: payload.message,
            timestamp: new Date().toISOString(),
            roomId: payload.roomId
          }
        ];
      });
    };

    const handleRequestCreated = (payload) => {
      if (!payload) return;
      let ownerOfRoom = false;
      setJoinedRooms((previous) =>
        previous.map((room) => {
          if (room.id !== payload.roomId) {
            return room;
          }
          if (room.isOwner) {
            ownerOfRoom = true;
          }
          return {
            ...room,
            pendingCount: payload.pendingCount
          };
        })
      );

      if (!ownerOfRoom) {
        return;
      }

      if (payload.request && activeRoomId === payload.roomId && activeRoomType === 'request') {
        setRoomRequests((previous) => {
          const exists = previous.some((request) => request.id === payload.request.id);
          if (exists) {
            return previous;
          }
          return [...previous, payload.request];
        });
      }

      if (payload.request?.username) {
        toast(`${payload.request.username} requested to join ${payload.roomName}`);
      }
    };

    const handleRequestResolved = (payload) => {
      if (!payload) return;
      let ownerOfRoom = false;
      setJoinedRooms((previous) =>
        previous.map((room) => {
          if (room.id !== payload.roomId) {
            return room;
          }
          if (room.isOwner) {
            ownerOfRoom = true;
          }
          return {
            ...room,
            pendingCount: payload.pendingCount,
            memberCount: payload.memberCount ?? room.memberCount
          };
        })
      );

      if (!ownerOfRoom) {
        return;
      }

      if (activeRoomId === payload.roomId && activeRoomType === 'request') {
        setRoomRequests((previous) =>
          previous.filter((request) => request.id !== payload.request?.id)
        );
      }

      if (payload.performedBy === user?.id) {
        return;
      }

      if (payload.request?.username) {
        const message =
          payload.action === 'approve'
            ? `${payload.request.username} was approved for ${payload.roomName}`
            : `${payload.request.username} was denied for ${payload.roomName}`;
        if (payload.action === 'approve') {
          toast.success(message);
        } else {
          toast(message);
        }
      }
    };

    const handleMembershipApproved = (payload) => {
      if (!payload) return;
      toast.success(`Your request to join ${payload.roomName} was approved.`);
      loadJoinedRooms({ focusRoomId: payload.roomId });
      setDiscoverRooms((previous) =>
        previous.map((room) =>
          room.id === payload.roomId
            ? { ...room, isMember: true, hasPendingRequest: false }
            : room
        )
      );
      setSelectedDiscoverRoom((previous) =>
        previous && previous.id === payload.roomId
          ? { ...previous, isMember: true, hasPendingRequest: false }
          : previous
      );
      if (activeView === 'discover') {
        loadDiscoverRooms(discoverFilterRef.current);
      }
    };

    const handleMembershipDenied = (payload) => {
      if (!payload) return;
      toast.error(`Your request to join ${payload.roomName} was denied.`);
      setDiscoverRooms((previous) =>
        previous.map((room) =>
          room.id === payload.roomId
            ? { ...room, hasPendingRequest: false }
            : room
        )
      );
      setSelectedDiscoverRoom((previous) =>
        previous && previous.id === payload.roomId
          ? { ...previous, hasPendingRequest: false }
          : previous
      );
      if (activeView === 'discover') {
        loadDiscoverRooms(discoverFilterRef.current);
      }
    };

    const handleMemberBroadcast = (payload) => {
      if (!payload) return;
      setJoinedRooms((previous) =>
        previous.map((room) => {
          if (room.id !== payload.roomId) {
            return room;
          }
          const updated = {
            ...room,
            memberCount: payload.memberCount ?? room.memberCount,
            moderatorCount: payload.moderatorCount ?? room.moderatorCount,
            bannedCount: payload.bannedCount ?? room.bannedCount
          };
          if (payload.user?.id === user?.id) {
            if (payload.action === 'promote') {
              updated.isModerator = true;
              updated.isMember = true;
            } else if (payload.action === 'demote') {
              updated.isModerator = false;
            } else if (payload.action === 'remove' || payload.action === 'ban') {
              updated.isMember = false;
              updated.isModerator = false;
            }
          }
          return updated;
        })
      );

      if (payload.actor?.id !== user?.id) {
        if (payload.action === 'ban') {
          toast.error(`${payload.user?.username || 'A member'} was banned.`);
        } else if (payload.action === 'remove') {
          toast(`${payload.user?.username || 'A member'} was removed from the room.`);
        } else if (payload.action === 'promote') {
          toast.success(`${payload.user?.username || 'A member'} is now a moderator.`);
        } else if (payload.action === 'demote') {
          toast(`${payload.user?.username || 'A member'} is no longer a moderator.`);
        }
      }

      if (
        payload.roomId === activeRoomId &&
        activeView === 'home' &&
        (isOwner || isModerator)
      ) {
        loadMembers(payload.roomId);
      }
    };

    const handleMembershipUpdate = (payload) => {
      if (!payload) return;
      const { roomId, action, roomName, banned } = payload;

      if (action === 'ban') {
        toast.error(`You have been banned from ${roomName}.`);
      } else if (action === 'remove') {
        toast(`You have been removed from ${roomName}.`);
      } else if (action === 'promote') {
        toast.success(`You are now a moderator in ${roomName}.`);
      } else if (action === 'demote') {
        toast(`You are no longer a moderator in ${roomName}.`);
      } else if (action === 'unban') {
        toast.success(`You have been unbanned from ${roomName}.`);
      }

      loadJoinedRooms({ focusRoomId: action === 'ban' || action === 'remove' ? undefined : roomId });

      if (roomId === activeRoomId) {
        if (action === 'ban' || action === 'remove') {
          if (socket) {
            socket.emit('leaveRoom', { roomId });
          }
          setActiveRoomId(null);
          setMessages([]);
          setPendingState(false);
          setRoomMembers([]);
          setBannedUsers([]);
          setMemberPermissions({ canManage: false, canPromote: false, currentRole: 'member' });
        } else if (action === 'promote' || action === 'demote') {
          loadMembers(roomId);
        } else if (action === 'unban' && banned === false) {
          loadMembers(roomId);
        }
      }
    };

    socket.on('room:message', handleIncomingMessage);
    socket.on('room:userEvent', handleUserEvent);
    socket.on('room:requestCreated', handleRequestCreated);
    socket.on('room:requestResolved', handleRequestResolved);
    socket.on('room:membershipApproved', handleMembershipApproved);
    socket.on('room:membershipDenied', handleMembershipDenied);
    socket.on('room:memberAction', handleMemberBroadcast);
    socket.on('room:membershipUpdate', handleMembershipUpdate);

    return () => {
      socket.off('room:message', handleIncomingMessage);
      socket.off('room:userEvent', handleUserEvent);
      socket.off('room:requestCreated', handleRequestCreated);
      socket.off('room:requestResolved', handleRequestResolved);
      socket.off('room:membershipApproved', handleMembershipApproved);
      socket.off('room:membershipDenied', handleMembershipDenied);
      socket.off('room:memberAction', handleMemberBroadcast);
      socket.off('room:membershipUpdate', handleMembershipUpdate);
    };
  }, [
    socket,
    activeRoomId,
    activeRoomType,
    user?.id,
    loadJoinedRooms,
    loadDiscoverRooms,
    activeView,
    isOwner,
    isModerator,
    loadMembers
  ]);

  useEffect(() => {
    if (!socket || !activeRoomId || !isReady || activeView !== 'home') return;

    setMessages([]);
    setPendingState(false);

    socket.emit('joinRoom', { roomId: activeRoomId }, async (response) => {
      if (!response) {
        await loadMessages(activeRoomId);
        return;
      }

      if (response.status === 'pending') {
        setPendingState(true);
        setMessages([]);
        toast('Join request sent to the room owner.');
        return;
      }

      if (response.status === 'error') {
        setPendingState(true);
        setMessages([]);
        toast.error(response.message || 'Unable to join room');
        return;
      }

      await loadMessages(activeRoomId);
    });
  }, [socket, isReady, activeRoomId, activeView, loadMessages]);

  useEffect(() => {
    if (
      !activeRoomId ||
      !(isOwner || isModerator) ||
      activeView !== 'home' ||
      !activeRoom ||
      activeRoom.type !== 'request'
    ) {
      setRoomRequests([]);
      return;
    }

    const loadRequests = async () => {
      try {
        setRequestsLoading(true);
        const data = await fetchRequests(activeRoomId);
        setRoomRequests(data.requests || []);
      } catch (error) {
        const message = error.response?.data?.message || 'Failed to load requests';
        toast.error(message);
      } finally {
        setRequestsLoading(false);
      }
    };

    loadRequests();
  }, [activeRoomId, isOwner, isModerator, activeView, activeRoom]);

  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      setPendingState(false);
    }
  }, [activeRoomId]);

  useLayoutEffect(() => {
    if (!activeRoomId || messagesLoading) return;
    scrollMessagesToBottom('auto', true);
  }, [activeRoomId, messagesLoading, pendingState, scrollMessagesToBottom]);

  useLayoutEffect(() => {
    if (messagesLoading || messages.length === 0) return;
    const behavior = messages.length <= 1 ? 'auto' : 'smooth';
    scrollMessagesToBottom(behavior);
  }, [messages, messagesLoading, scrollMessagesToBottom]);

  const renderJoinedSidebarContent = (variant = 'static') => {
    const containerClass = clsx('space-y-4', variant === 'drawer' ? 'flex h-full flex-col' : '');
    const listSectionClass = clsx(variant === 'drawer' ? 'flex-1' : '');
    const listContainerClass = clsx(
      variant === 'drawer' ? 'h-full' : '',
      'space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm transition-colors duration-300 dark:border-slate-900 dark:bg-slate-900/60'
    );

    return (
      <div className={containerClass}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {variant === 'drawer' ? (
              <button
                type="button"
                onClick={closeSidebar}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                title="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            ) : null}
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Joined Rooms
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCreateRoomOpen(true);
              if (variant === 'drawer') {
                closeSidebar();
              }
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-brand-600 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-slate-800"
            title="Create room"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Search
          </label>
          <input
            type="text"
            value={joinedSearch}
            onChange={(event) => setJoinedSearch(event.target.value)}
            placeholder="Search your rooms"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <div className={listSectionClass}>
          <div className={listContainerClass}>
            {joinedLoading ? (
              <p className="px-2 py-4 text-sm text-slate-500 dark:text-slate-400">Loading rooms...</p>
            ) : filteredJoinedRooms.length > 0 ? (
              filteredJoinedRooms.map((room) => {
                const preview = room.lastMessage
                  ? `${room.lastMessage.sender ? `${room.lastMessage.sender}: ` : ''}${room.lastMessage.text}`
                  : room.description || 'No messages yet.';
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleSelectRoom(room.id)}
                    className={clsx(
                      'w-full rounded-xl border px-4 py-3 text-left transition shadow-sm',
                      room.id === activeRoomId
                        ? 'border-brand-400 bg-brand-50 text-slate-900 dark:border-brand-500 dark:bg-brand-500/10 dark:text-slate-100'
                        : 'border-transparent bg-white hover:border-brand-300 hover:bg-brand-50/70 dark:bg-slate-900/50 dark:hover:border-brand-500/30 dark:hover:bg-slate-900'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white" title={room.name}>
                        {room.name}
                      </p>
                      <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {room.lastActivity ? dayjs(room.lastActivity).fromNow() : '—'}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{preview}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="capitalize">{room.type}</span>
                    <span>• {room.memberCount} member{room.memberCount === 1 ? '' : 's'}</span>
                    <span>
                      • Role: {room.isOwner ? 'Owner' : room.isModerator ? 'Moderator' : 'Member'}
                    </span>
                    {room.pendingCount > 0 && room.isOwner && room.type === 'request' ? (
                      <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                        {room.pendingCount} pending
                      </span>
                    ) : null}
                    </div>
                  </button>
                );
              })
            ) : joinedRooms.length === 0 ? (
              <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-5 text-center dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  You haven’t joined any rooms yet.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visit the Discover page to browse public and request-only communities.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('discover');
                    closeSidebar();
                  }}
                  className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  Go to Discover
                </button>
              </div>
            ) : (
              <p className="px-2 py-4 text-sm text-slate-500 dark:text-slate-400">No rooms found for that search.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const viewSwitcher = (
    <div className="inline-flex flex-shrink-0 items-center rounded-2xl border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {['home', 'discover'].map((viewKey) => (
        <button
          key={viewKey}
          type="button"
          onClick={() => setActiveView(viewKey)}
          className={clsx(
            'rounded-xl px-1.5 py-1 text-xs font-semibold transition sm:px-3 sm:py-2 sm:text-sm',
            activeView === viewKey
              ? 'bg-brand-500 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          )}
        >
          {viewKey === 'home' ? 'Home' : 'Discover'}
        </button>
      ))}
    </div>
  );

  const renderHomeView = () => (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="hidden lg:flex lg:w-80 lg:flex-col">
        {renderJoinedSidebarContent()}
      </aside>

      <section className="flex-1 space-y-4">
        <div className="flex items-center justify-between lg:hidden">
          <button
            type="button"
            onClick={openSidebar}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Bars3Icon className="h-5 w-5" />
            Rooms
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md transition-colors duration-300 dark:border-slate-900 dark:bg-slate-900">
          {activeRoom ? (
            <>
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 truncate">
                    <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                      {activeRoom.name}
                    </h2>
                    <span
                      className={clsx(
                        'inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold uppercase transition',
                        activeRoom.type === 'public'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200'
                          : activeRoom.type === 'request'
                            ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200'
                            : 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200'
                      )}
                      title={
                        activeRoom.type === 'public'
                          ? 'Public room'
                          : activeRoom.type === 'request'
                            ? 'Request-to-join room'
                            : 'Private room'
                      }
                    >
                      {activeRoom.type === 'public' ? (
                        <GlobeAltIcon className="h-4 w-4" />
                      ) : activeRoom.type === 'request' ? (
                        <UserGroupIcon className="h-4 w-4" />
                      ) : (
                        <LockClosedIcon className="h-4 w-4" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{activeRoom.memberCount} members</span>
                  <span>• Created {dayjs(activeRoom.createdAt).fromNow()}</span>
                </div>
              </div>

              <div
                ref={messagesContainerRef}
                className="h-[420px] space-y-3 overflow-y-auto bg-slate-50/70 px-6 py-6 transition-colors duration-300 dark:bg-slate-950/40"
              >
                {messagesLoading ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Loading conversation...</p>
                ) : pendingState ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Waiting for approval. You will be notified once the owner approves your request.
                  </p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No messages yet. Start the conversation!</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={clsx(
                        'rounded-2xl border px-4 py-3 shadow-sm transition',
                        message.type === 'event'
                          ? 'border-dashed border-slate-300 bg-white/70 text-center text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400'
                          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                      )}
                    >
                      {message.type === 'event' ? (
                        <p>{message.text}</p>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{message.username}</span>
                            <span>{dayjs(message.timestamp).fromNow()}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">{message.text}</p>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
                <form className="flex items-center gap-3" onSubmit={handleMessageSubmit}>
                  <input
                    name="message"
                    type="text"
                    placeholder={pendingState ? 'Awaiting approval...' : 'Write a message'}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
                    disabled={!activeRoom || messagesLoading || pendingState}
                  />
                  <button
                    type="submit"
                    className="rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!activeRoom || messagesLoading || pendingState}
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex h-[520px] flex-col items-center justify-center gap-3 bg-slate-50/70 px-6 text-center transition-colors duration-300 dark:bg-slate-950/40">
              <p className="text-base font-medium text-slate-600 dark:text-slate-300">
                Select a room to start chatting.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Choose from your joined rooms on the left or discover new communities to join.
              </p>
            </div>
          )}
        </div>

        {activeRoom && (isOwner || isModerator) ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md transition-colors duration-300 dark:border-slate-900 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {isOwner ? 'Owner tools' : 'Moderator tools'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage members, requests, and room access.
                </p>
                <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Your role: {currentRoomRole}
                </p>
              </div>
            </div>

            {activeRoom.type === 'request' ? (
              <div className="mt-6">
                <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Pending requests</h4>
                <div className="mt-3 space-y-2">
                  {requestsLoading ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading requests...</p>
                  ) : roomRequests.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No pending requests right now.</p>
                  ) : (
                    roomRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{request.username}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Waiting for your approval</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRequestAction(request.id, 'deny')}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            Deny
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestAction(request.id, 'approve')}
                            className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            {canManageMembers ? (
              <div className="mt-6">
                <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Members</h4>
                {membersLoading ? (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading members...</p>
                ) : roomMembers.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No members found.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {roomMembers.map((member) => {
                      const isSelf = member.id === user.id;
                      const isTargetOwner = member.role === 'owner';
                      const isTargetModerator = member.role === 'moderator';
                      const canRemove =
                        !isSelf &&
                        !isTargetOwner &&
                        ((canPromoteMembers && (member.role === 'member' || isTargetModerator)) ||
                          (currentRoomRole === 'moderator' && member.role === 'member'));
                      const canBan = canRemove;
                      const canPromote = canPromoteMembers && member.role === 'member';
                      const canDemote = canPromoteMembers && member.role === 'moderator';

                      return (
                        <div
                          key={member.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition dark:border-slate-800 dark:bg-slate-900"
                        >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900 dark:text-slate-100">{member.username}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {member.role === 'owner' ? 'Moderator' : member.role}
                        </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {canPromote ? (
                              <button
                                type="button"
                                onClick={() => handleMemberAction(member.id, 'promote')}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                Promote
                              </button>
                            ) : null}
                            {canDemote ? (
                              <button
                                type="button"
                                onClick={() => handleMemberAction(member.id, 'demote')}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                Demote
                              </button>
                            ) : null}
                            {canRemove ? (
                              <button
                                type="button"
                                onClick={() => handleMemberAction(member.id, 'remove')}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-amber-600 transition hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 dark:border-slate-700 dark:text-amber-300 dark:hover:bg-slate-800/70"
                              >
                                Remove
                              </button>
                            ) : null}
                            {canBan ? (
                              <button
                                type="button"
                                onClick={() => handleMemberAction(member.id, 'ban')}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 dark:border-slate-700 dark:text-rose-400 dark:hover:bg-rose-500/20"
                              >
                                Ban
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {canManageMembers && bannedUsers.length > 0 ? (
              <div className="mt-6">
                <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Banned</h4>
                <div className="mt-3 space-y-2">
                  {bannedUsers.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition dark:border-slate-800 dark:bg-slate-900"
                    >
                      <span className="text-slate-700 dark:text-slate-200">{entry.username}</span>
                      <button
                        type="button"
                        onClick={() => handleMemberAction(entry.id, 'unban')}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:border-slate-700 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                      >
                        Unban
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {isOwner ? (
              <div className="mt-6">
                <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Invite teammates</h4>
                <form className="mt-3 flex flex-col gap-3 sm:flex-row" onSubmit={handleInvite}>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inviteUsername}
                      onChange={(event) => setInviteUsername(event.target.value)}
                      placeholder="Enter username"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={inviting}
                  >
                    <UserPlusIcon className="h-4 w-4" />
                    {inviting ? 'Inviting...' : 'Send invite'}
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );

  const renderDiscoverView = () => (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md transition-colors duration-300 dark:border-slate-900 dark:bg-slate-900">
        <form className="flex flex-col gap-4 md:flex-row" onSubmit={handleDiscoverSearch}>
          <div className="flex-1">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="discoverSearch">
              Search rooms
            </label>
            <input
              id="discoverSearch"
              type="text"
              value={discoverSearchInput}
              onChange={(event) => setDiscoverSearchInput(event.target.value)}
              placeholder="Search by room name"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="md:w-48">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="discoverType">
              Type
            </label>
            <select
              id="discoverType"
              value={discoverTypeInput}
              onChange={(event) => setDiscoverTypeInput(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
            >
              <option value="all">All rooms</option>
              <option value="public">Public</option>
              <option value="request">Request to Join</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleResetDiscover}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Reset
            </button>
          </div>
        </form>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Browse public rooms that you can join instantly or request access to moderated spaces.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {discoverLoading ? (
          <div className="col-span-full rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm dark:border-slate-900 dark:bg-slate-900 dark:text-slate-400">
            Loading rooms...
          </div>
        ) : discoverRooms.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            No rooms match your filters yet. Try adjusting the search or type filter.
          </div>
        ) : (
          discoverRooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => setSelectedDiscoverRoom(room)}
              className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-brand-400 hover:shadow-lg dark:border-slate-900 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-slate-900 dark:text-white">{room.name}</p>
                <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {room.type}
                </span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">
                {room.description || 'No description provided.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>{room.memberCount} member{room.memberCount === 1 ? '' : 's'}</span>
                <span>• Owner: {room.owner}</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[11px] font-medium">
                {room.isMember ? (
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                    You’re a member
                  </span>
                ) : room.hasPendingRequest ? (
                  <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                    Request pending
                  </span>
                ) : null}
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 transition-colors duration-300 dark:border-slate-900/70 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveView('home');
                closeSidebar();
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-transparent px-3 py-1.5 text-base font-semibold text-slate-900 transition hover:border-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-white"
            >
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-brand-500" />
              <span>Chatie</span>
            </button>
          </div>
          <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4">
            <div className="flex-shrink-0">{viewSwitcher}</div>
            <Menu as="div" className="relative">
              <Menu.Button className="inline-flex min-w-0 max-w-[140px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
                  {avatarInitial}
                </span>
                <span className="hidden sm:flex min-w-0 flex-1 flex-col truncate">
                  <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.username}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{connectionLabel}</span>
                </span>
                <ChevronDownIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-[180px] max-w-[180px] origin-top-right rounded-2xl border border-slate-200 bg-white p-2 text-sm shadow-xl focus:outline-none dark:border-slate-800 dark:bg-slate-900 sm:w-[140px] sm:max-w-[140px]">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.username}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">Status: {connectionLabel}</p>
                  </div>
                  <div className="px-3 py-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleTheme();
                      }}
                      className={clsx(
                        'group relative flex h-8 w-16 items-center rounded-full px-2 transition-colors',
                        isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-amber-400 hover:bg-amber-300'
                      )}
                      aria-label="Toggle theme"
                      aria-pressed={isDark}
                    >
                      <SunIcon
                        className={clsx(
                          'h-4 w-4 text-white transition-opacity',
                          isDark ? 'opacity-60' : 'opacity-100'
                        )}
                      />
                      <MoonIcon
                        className={clsx(
                          'ml-auto h-4 w-4 text-slate-100 transition-opacity',
                          isDark ? 'opacity-100' : 'opacity-60'
                        )}
                      />
                      <span
                        className={clsx(
                          'pointer-events-none absolute left-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white shadow-lg transition-transform',
                          isDark ? 'translate-x-7' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        type="button"
                        onClick={logout}
                        className={clsx(
                          'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-rose-600 dark:text-rose-400',
                          active ? 'bg-rose-50 dark:bg-rose-500/10' : ''
                        )}
                      >
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl flex-1 px-6 py-6">
        {activeView === 'home' ? renderHomeView() : renderDiscoverView()}
      </main>

      <Transition show={isSidebarOpen} as={Fragment}>
        <Dialog className="relative z-50 lg:hidden" onClose={closeSidebar}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="-translate-x-full opacity-0"
              enterTo="translate-x-0 opacity-100"
              leave="ease-in duration-150"
              leaveFrom="translate-x-0 opacity-100"
              leaveTo="-translate-x-full opacity-0"
            >
              <Dialog.Panel className="flex h-full w-full max-w-xs flex-col bg-white p-6 shadow-2xl transition-colors duration-300 dark:bg-slate-950">
                {renderJoinedSidebarContent('drawer')}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      <Transition show={isCreateRoomOpen} as={Fragment}>
        <Dialog className="relative z-50" onClose={() => setIsCreateRoomOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-3"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-3"
            >
              <Dialog.Panel className="w-full max-w-lg space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-1">
                  <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-white">
                    Create a new room
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
                    Group conversations by topic, team, or project.
                  </Dialog.Description>
                </div>

                <form className="space-y-5" onSubmit={handleCreateRoom}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="roomName">
                      Room name
                    </label>
                    <input
                      id="roomName"
                      type="text"
                      value={createRoomForm.name}
                      onChange={(event) =>
                        setCreateRoomForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder="e.g. design-lab"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="roomDescription">
                      Description
                    </label>
                    <textarea
                      id="roomDescription"
                      rows={3}
                      value={createRoomForm.description}
                      onChange={(event) =>
                        setCreateRoomForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Tell members what this room is about"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Privacy</p>
                    <div className="grid gap-3 md:grid-cols-3">
                      {roomTypes.map((option) => (
                        <label
                          key={option.value}
                          className={clsx(
                            'cursor-pointer rounded-2xl border px-4 py-3 transition shadow-sm',
                            createRoomForm.type === option.value
                              ? 'border-brand-400 bg-brand-50 text-slate-900 dark:border-brand-500 dark:bg-brand-500/10 dark:text-slate-100'
                              : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/60 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-brand-500/30 dark:hover:bg-slate-900'
                          )}
                        >
                          <input
                            type="radio"
                            name="room-type"
                            value={option.value}
                            checked={createRoomForm.type === option.value}
                            onChange={() =>
                              setCreateRoomForm((prev) => ({ ...prev, type: option.value }))
                            }
                            className="hidden"
                          />
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{option.label}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{option.description}</p>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => setIsCreateRoomOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-60"
                      disabled={creatingRoom}
                    >
                      {creatingRoom ? 'Creating...' : 'Create room'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      <Transition show={Boolean(selectedDiscoverRoom)} as={Fragment}>
        <Dialog className="relative z-50" onClose={() => setSelectedDiscoverRoom(null)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-3"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-3"
            >
              <Dialog.Panel className="w-full max-w-xl space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
                {selectedDiscoverRoom ? (
                  <>
                    <div className="space-y-1">
                      <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-white">
                        {selectedDiscoverRoom.name}
                      </Dialog.Title>
                      <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
                        Hosted by {selectedDiscoverRoom.owner} • {selectedDiscoverRoom.memberCount} member
                        {selectedDiscoverRoom.memberCount === 1 ? '' : 's'}
                      </Dialog.Description>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {selectedDiscoverRoom.description || 'No description provided for this room yet.'}
                    </p>

                    {selectedDiscoverRoom.lastMessage ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
                        <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Last activity</p>
                        <p className="mt-1 font-medium text-slate-600 dark:text-slate-200">
                          {selectedDiscoverRoom.lastMessage.sender
                            ? `${selectedDiscoverRoom.lastMessage.sender}: `
                            : ''}
                          {selectedDiscoverRoom.lastMessage.text}
                        </p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          {dayjs(selectedDiscoverRoom.lastActivity).fromNow()}
                        </p>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="rounded-full bg-slate-100 px-3 py-1 capitalize dark:bg-slate-800">
                        {selectedDiscoverRoom.type}
                      </span>
                      {selectedDiscoverRoom.hasPendingRequest ? (
                        <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                          Request pending
                        </span>
                      ) : null}
                      {selectedDiscoverRoom.isMember ? (
                        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                          You’re a member
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedDiscoverRoom(null)}
                        className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Close
                      </button>
                      {selectedDiscoverRoom.isMember ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDiscoverRoom(null);
                            setActiveView('home');
                            if (joinedRooms.some((room) => room.id === selectedDiscoverRoom.id)) {
                              handleSelectRoom(selectedDiscoverRoom.id);
                            } else {
                              loadJoinedRooms({ focusRoomId: selectedDiscoverRoom.id });
                            }
                          }}
                          className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                        >
                          Open chat
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDiscoverAction(selectedDiscoverRoom)}
                          className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={joiningRoomId === selectedDiscoverRoom.id || selectedDiscoverRoom.hasPendingRequest}
                        >
                          {joiningRoomId === selectedDiscoverRoom.id
                            ? 'Processing...'
                            : selectedDiscoverRoom.type === 'request'
                              ? selectedDiscoverRoom.hasPendingRequest
                                ? 'Request pending'
                                : 'Request to join'
                              : 'Join room'}
                        </button>
                      )}
                    </div>
                  </>
                ) : null}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default ChatLayout;
