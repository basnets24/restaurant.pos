import { useMenu } from "../api";
import { Card, CardContent } from "@/components/ui/card";

export function Catalog() {
    const { data, isLoading, error } = useMenu();
    if (isLoading) return <div>Loading menu…</div>;
    if (error) return <div className="text-red-600">Failed to load.</div>;

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">{item.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                    ${item.price.toFixed(2)}
                                </p>
                            </div>
                            <span className="text-xs rounded-full border px-2 py-1">
                {item.isAvailable ? "Available" : "Out"}
              </span>
                        </div>
                        {item.description && (
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                                {item.description}
                            </p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
