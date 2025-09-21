import dayjs from 'dayjs';
import clsx from 'clsx';
import { GlobeAltIcon, UserGroupIcon, LockClosedIcon } from '@heroicons/react/24/outline';

const ChatHeader = ({ room }) => {
  if (!room) return null;
  return (
    <div className="flex flex-wrap items-start gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800 sm:items-center sm:gap-4">
      <div className="order-1 flex min-w-0 flex-1 items-center gap-2 truncate">
        <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">{room.name}</h2>
        <span
          className={clsx(
            'inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold uppercase transition',
            room.type === 'public'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200'
              : room.type === 'request'
                ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200'
                : 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200'
          )}
          title={
            room.type === 'public'
              ? 'Public room'
              : room.type === 'request'
                ? 'Request-to-join room'
                : 'Private room'
          }
        >
          {room.type === 'public' ? (
            <GlobeAltIcon className="h-4 w-4" />
          ) : room.type === 'request' ? (
            <UserGroupIcon className="h-4 w-4" />
          ) : (
            <LockClosedIcon className="h-4 w-4" />
          )}
        </span>
      </div>
      <div className="order-2 flex w-full flex-shrink-0 items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 sm:w-auto sm:justify-end">
        <span>{room.memberCount} members</span>
        <span>{dayjs(room.createdAt).fromNow()}</span>
      </div>
    </div>
  );
};

export default ChatHeader;
