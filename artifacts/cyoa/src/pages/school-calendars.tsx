import { useAuth } from '@/contexts/auth-context';
import { useListSchoolCalendars, getListSchoolCalendarsQueryKey } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { ArrowLeft, CalendarDays, Plus } from 'lucide-react';

export default function SchoolCalendars() {
  const { activePartyId } = useAuth();
  
  const { data: calendars, isLoading } = useListSchoolCalendars(
    { partyId: activePartyId! },
    { query: { enabled: !!activePartyId, queryKey: getListSchoolCalendarsQueryKey({ partyId: activePartyId! }) } }
  );

  if (!activePartyId) return null;

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-background text-foreground">
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <Link href="/party" className="text-muted-foreground p-1">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-pixel text-primary flex items-center gap-2">
          ROUTINES
        </h1>
      </div>

      <div className="p-4 flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          Manage routines like School Calendars to automatically pause specific quests on days off.
        </p>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-card rounded-xl"></div>
          </div>
        ) : (
          <>
            {calendars && calendars.length > 0 ? (
              <div className="flex flex-col gap-4">
                {calendars.map(cal => (
                  <div key={cal.id} className="bg-card border border-border rounded-xl p-4">
                    <h3 className="font-bold text-lg">{cal.name}</h3>
                    <div className="text-xs text-muted-foreground mt-1">
                      {cal.yearStart} - {cal.yearEnd}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold">No routines configured.</p>
              </div>
            )}
          </>
        )}
      </div>

      <button className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-30">
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}