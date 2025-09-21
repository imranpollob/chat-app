import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Dialog, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, MoonIcon, SunIcon, PlusIcon, ChatBubbleLeftRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
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
import DiscoverFilters from './chat/DiscoverFilters';
import DiscoverGrid from './chat/DiscoverGrid';
import DiscoverRoomModal from './chat/DiscoverRoomModal';
import JoinedRoomsSidebar from './chat/JoinedRoomsSidebar';
import ChatHeader from './chat/ChatHeader';
import MessageList from './chat/MessageList';
import MessageComposer from './chat/MessageComposer';
import CreateRoomModal from './chat/CreateRoomModal';
import PendingRequestsList from './chat/PendingRequestsList';
import MemberManagement from './chat/MemberManagement';
import InviteForm from './chat/InviteForm';

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
      toast.dismiss();
      toast.success(`Found ${data.length} room${data.length === 1 ? '' : 's'}`);
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

  // renderJoinedSidebarContent replaced by JoinedRoomsSidebar component

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
        <JoinedRoomsSidebar
          joinedRooms={joinedRooms}
          filteredJoinedRooms={filteredJoinedRooms}
          joinedLoading={joinedLoading}
          joinedSearch={joinedSearch}
          setJoinedSearch={setJoinedSearch}
          activeRoomId={activeRoomId}
          onSelectRoom={handleSelectRoom}
          onCreateRoom={() => setIsCreateRoomOpen(true)}
          setActiveView={setActiveView}
        />
      </aside>

      <section className="flex-1 space-y-4">
        <div className="flex items-center justify-between gap-2 lg:hidden">
          <button
            type="button"
            onClick={openSidebar}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Bars3Icon className="h-5 w-5" />
            Rooms
          </button>
          <button
            type="button"
            onClick={() => setIsCreateRoomOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-brand-600 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-slate-800"
          >
            <PlusIcon className="h-4 w-4" />
            Create room
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md transition-colors duration-300 dark:border-slate-900 dark:bg-slate-900">
          {activeRoom ? (
            <>
              <ChatHeader room={activeRoom} />

              <MessageList messagesRef={messagesContainerRef} messages={messages} loading={messagesLoading} pending={pendingState} />

              <MessageComposer
                disabled={!activeRoom || messagesLoading || pendingState}
                pendingPlaceholder={pendingState ? 'Awaiting approval...' : 'Write a message'}
                onSubmit={handleMessageSubmit}
              />
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
              <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Your role: {currentRoomRole}
              </p>
            </div>

            {activeRoom.type === 'request' ? (
              <PendingRequestsList
                requests={roomRequests}
                loading={requestsLoading}
                onAction={handleRequestAction}
              />
            ) : null}

            <MemberManagement
              members={roomMembers}
              banned={bannedUsers}
              loading={membersLoading}
              canManageMembers={canManageMembers}
              canPromoteMembers={canPromoteMembers}
              currentUserId={user.id}
              currentRole={currentRoomRole}
              onAction={handleMemberAction}
            />

            {/* Banned users section moved into MemberManagement */}

            {isOwner ? (
              <InviteForm
                username={inviteUsername}
                setUsername={setInviteUsername}
                inviting={inviting}
                onSubmit={handleInvite}
              />
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );

  const renderDiscoverView = () => (
    <section className="space-y-6">
      <DiscoverFilters
        searchValue={discoverSearchInput}
        onSearchChange={setDiscoverSearchInput}
        typeValue={discoverTypeInput}
        onTypeChange={setDiscoverTypeInput}
        onSubmit={handleDiscoverSearch}
        onReset={handleResetDiscover}
        onCreateRoom={() => setIsCreateRoomOpen(true)}
      />
      <DiscoverGrid loading={discoverLoading} rooms={discoverRooms} onSelect={setSelectedDiscoverRoom} />
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
                <JoinedRoomsSidebar
                  variant="drawer"
                  joinedRooms={joinedRooms}
                  filteredJoinedRooms={filteredJoinedRooms}
                  joinedLoading={joinedLoading}
                  joinedSearch={joinedSearch}
                  setJoinedSearch={setJoinedSearch}
                  activeRoomId={activeRoomId}
                  onSelectRoom={handleSelectRoom}
                  onCreateRoom={() => setIsCreateRoomOpen(true)}
                  onCloseDrawer={closeSidebar}
                  setActiveView={setActiveView}
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      <CreateRoomModal
        open={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        roomTypes={roomTypes}
        form={createRoomForm}
        setForm={setCreateRoomForm}
        creating={creatingRoom}
        onSubmit={handleCreateRoom}
      />

      <DiscoverRoomModal
        room={selectedDiscoverRoom}
        joiningRoomId={joiningRoomId}
        onClose={() => setSelectedDiscoverRoom(null)}
        onJoinOrRequest={() => selectedDiscoverRoom && handleDiscoverAction(selectedDiscoverRoom)}
        onOpenChat={() => {
          if (!selectedDiscoverRoom) return;
          const room = selectedDiscoverRoom;
          setSelectedDiscoverRoom(null);
          setActiveView('home');
          if (joinedRooms.some((r) => r.id === room.id)) {
            handleSelectRoom(room.id);
          } else {
            loadJoinedRooms({ focusRoomId: room.id });
          }
        }}
        isAlreadyMember={Boolean(selectedDiscoverRoom?.isMember)}
      />
    </div>
  );
};

export default ChatLayout;
