import clsx from 'clsx';
import dayjs from 'dayjs';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

const JoinedRoomsSidebar = ({
  variant = 'static',
  joinedRooms,
  filteredJoinedRooms,
  joinedLoading,
  joinedSearch,
  setJoinedSearch,
  activeRoomId,
  onSelectRoom,
  onCreateRoom,
  onCloseDrawer,
  setActiveView,
}) => {
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
              onClick={onCloseDrawer}
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
            onCreateRoom();
            if (variant === 'drawer') onCloseDrawer?.();
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-brand-600 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-slate-800"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Create room</span>
        </button>
      </div>

      <div>
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
                  onClick={() => onSelectRoom(room.id)}
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
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{preview}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{room.lastActivity ? dayjs(room.lastActivity).fromNow() : '—'}</span>
                    <span className="ml-auto font-medium text-slate-600 dark:text-slate-300">
                      {room.isOwner ? 'Owner' : room.isModerator ? 'Moderator' : ''}
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
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">You haven’t joined any rooms yet.</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Visit the Discover page to browse public and request-only communities.</p>
              <button
                type="button"
                onClick={() => {
                  setActiveView('discover');
                  onCloseDrawer?.();
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

export default JoinedRoomsSidebar;
