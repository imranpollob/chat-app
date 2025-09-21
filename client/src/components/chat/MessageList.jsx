import dayjs from 'dayjs';
import clsx from 'clsx';

const MessageList = ({ messagesRef, messages, loading, pending }) => {
  return (
    <div
      ref={messagesRef}
      className="h-[420px] space-y-3 overflow-y-auto bg-slate-50/70 px-6 py-6 transition-colors duration-300 dark:bg-slate-950/40"
    >
      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading conversation...</p>
      ) : pending ? (
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
  );
};

export default MessageList;
