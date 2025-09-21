import DiscoverRoomCard from './DiscoverRoomCard';

const DiscoverGrid = ({ loading, rooms, onSelect }) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {loading ? (
      <div className="col-span-full rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm dark:border-slate-900 dark:bg-slate-900 dark:text-slate-400">
        Loading rooms...
      </div>
    ) : rooms.length === 0 ? (
      <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
        No rooms match your filters yet. Try adjusting the search or type filter.
      </div>
    ) : (
      rooms.map((room) => <DiscoverRoomCard key={room.id} room={room} onSelect={onSelect} />)
    )}
  </div>
);

export default DiscoverGrid;
