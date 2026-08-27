import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRound } from "lucide-react";

interface Reservation {
    guest: string;
    party: number;
    time: string;
    table: string;
}

// Static demo reservations — there's no reservations domain/API in the backend yet.
const RESERVATIONS: Reservation[] = [
    { guest: "R. Sharma", party: 4, time: "7:30 PM", table: "#4" },
    { guest: "A. Gurung", party: 6, time: "8:00 PM", table: "#12" },
    { guest: "J. Patel", party: 2, time: "8:15 PM", table: "#7" },
];

export default function ReservationsTab() {
    return (
        <>
            <h2 className="text-2xl font-bold text-foreground mb-5">Upcoming Reservations</h2>
            <div className="flex flex-col gap-3">
                {RESERVATIONS.map((r) => (
                    <Card key={r.guest + r.time} className="p-4 flex items-center gap-4 border-border bg-card">
                        <div className="w-11 h-11 shrink-0 rounded-[10px] bg-brand-soft flex items-center justify-center">
                            <UserRound className="w-5 h-5 text-brand-strong" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-foreground">{r.guest}</div>
                            <div className="text-xs text-muted-foreground">Party of {r.party} &middot; {r.time}</div>
                        </div>
                        <Badge variant="outline">Table {r.table}</Badge>
                    </Card>
                ))}
            </div>
        </>
    );
}
