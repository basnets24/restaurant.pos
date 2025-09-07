import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Settings } from "lucide-react";

type Loc = { id: string; name: string; active: boolean; address: string; hours: string };
const SAMPLE: Loc[] = [
  { id: "a", name: "Downtown", active: true, address: "123 Main St", hours: "Mon–Sun 11a–10p" },
  { id: "b", name: "Uptown", active: false, address: "45 North Ave", hours: "Fri–Sun 12p–9p" },
];

export default function LocationsPage() {
  const [items, setItems] = useState<Loc[]>(SAMPLE);
  const add = () => setItems(prev => [...prev, { id: Math.random().toString(36).slice(2,8), name: "New Location", active: true, address: "", hours: "Mon–Sun 11a–10p" }]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2"><MapPin className="h-5 w-5" /><h2 className="text-lg font-semibold">Locations</h2></div>
        <Button onClick={add}>+ Add Location</Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map(l => (
          <Card key={l.id}>
            <CardHeader className="py-3 flex-row items-center justify-between">
              <CardTitle className="text-base">{l.name}</CardTitle>
              <Badge variant={l.active?"secondary":"outline"}>{l.active ? "Active" : "Inactive"}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm"><span className="text-muted-foreground">Address: </span>{l.address || "Not set"}</div>
              <div className="text-sm"><span className="text-muted-foreground">Hours: </span>{l.hours}</div>
              <div className="pt-2">
                <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-1" /> Configure</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
