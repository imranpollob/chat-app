const MessageComposer = ({ disabled, pendingPlaceholder, onSubmit }) => {
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!onSubmit) return;
    onSubmit(event);
  };

  return (
    <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
      <form className="flex items-center gap-3" onSubmit={handleSubmit}>
        <input
          name="message"
          type="text"
          placeholder={pendingPlaceholder}
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500"
          disabled={disabled}
        />
        <button
          type="submit"
          className="rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default MessageComposer;
