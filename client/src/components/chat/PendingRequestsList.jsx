const PendingRequestsList = ({ requests, loading, onAction }) => {
  return (
    <div className="mt-6">
      <h4 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Pending requests</h4>
      <div className="mt-3 space-y-2">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading requests...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No pending requests right now.</p>
        ) : (
          requests.map((request) => (
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
                  onClick={() => onAction(request.id, 'deny')}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Deny
                </button>
                <button
                  type="button"
                  onClick={() => onAction(request.id, 'approve')}
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
  );
};

export default PendingRequestsList;
