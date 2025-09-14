import { useEffect, useMemo, useState } from "react";
import type { MenuItemDto, CreateMenuItemDto, UpdateMenuItemDto } from "@/domain/menu/types";
import { useMenuCategories, useMenuList, useToggleMenuAvailability, usePatchMenuItem, useCreateMenuItem, useRemoveMenuItem } from "@/domain/menu/hooks";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Utensils, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

// Props are optional; you can pass canWrite to disable create/edit when the user lacks rights
export default function MenuItemsCard({ canWrite = true }: { canWrite?: boolean }) {
    // Filters & paging
    const [name, setName] = useState("");
    const [category, setCategory] = useState<string>("all"); // sentinel
    const [available, setAvailable] = useState<string>("all"); // "all" | "true" | "false"
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const categories = useMenuCategories();

    const listParams = useMemo(() => ({
        name: name || undefined,
        category: category !== "all" ? category : undefined,
        available: available === "all" ? undefined : available === "true",
        page,
        pageSize,
    }), [name, category, available, page, pageSize]);

    const list = useMenuList(listParams);

    const items = list.data?.items ?? [];
    const total = list.data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // Mutations
    const mToggle = useToggleMenuAvailability();

    const mPatch = usePatchMenuItem();

    const mCreate = useCreateMenuItem();

    const mDelete = useRemoveMenuItem();

    // Dialog state (create/edit)
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<MenuItemDto | null>(null);

    useEffect(() => { if (!editOpen) setEditing(null); }, [editOpen]);

    return (
        <Card>
            <CardHeader className="flex items-center justify-between gap-4">
                <div>
                    <CardTitle className="flex items-center gap-2"><Utensils className="h-5 w-5"/> Menu Items</CardTitle>
                    <CardDescription>Manage your menu, prices, and availability. Creating/editing requires Admin or Manager.</CardDescription>
                </div>
                {canWrite && (
                    <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2"/>New Item</Button>
                )}
            </CardHeader>

            {/* Filters */}
            <CardContent className="space-y-4">
                {!canWrite && (
                    <div className="text-xs text-muted-foreground">You have read-only access to menu items.</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <Input placeholder="Search by name" value={name} onChange={(e) => setName(e.target.value)} />

                    <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
                        <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            {categories.data?.filter(c => c && c.trim() !== "").map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={available} onValueChange={(v) => { setAvailable(v); setPage(1); }}>
                        <SelectTrigger><SelectValue placeholder="Any status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Any status</SelectItem>
                            <SelectItem value="true">Available</SelectItem>
                            <SelectItem value="false">Hidden</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => { setName(""); setCategory("all"); setAvailable("all"); setPage(1); }}>Clear</Button>
                        <Button onClick={() => list.refetch()}>Apply</Button>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-2xl border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="w-32 text-right">Price</TableHead>
                                <TableHead>Availability</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {list.isLoading && <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>}
                            {!list.isLoading && items.length === 0 && <TableRow><TableCell colSpan={5}>No menu items</TableCell></TableRow>}
                            {items.map((m) => (
                                <TableRow key={m.id}>
                                    <TableCell>
                                        <div className="font-medium">{m.name}</div>
                                        <div className="text-xs opacity-70">{m.description || ""}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{m.category || "—"}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">${m.price.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch disabled={!canWrite} checked={m.isAvailable} onCheckedChange={(v) => mToggle.mutate({ id: m.id, value: v })} />
                                            <span className="text-sm">{m.isAvailable ? "Available" : "Hidden"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {canWrite && (
                                            <>
                                                <Button size="sm" variant="outline" onClick={() => { setEditing(m); setEditOpen(true); }}><Pencil className="h-4 w-4 mr-1"/>Edit</Button>
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                    onClick={() =>
                                                        mDelete.mutate(m.id, {
                                                            onSuccess: () => toast.success("Menu item deleted"),
                                                        })
                                                    }
                                                    disabled={mDelete.isPending}
                                                    aria-label="Delete menu item"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                    <div className="text-sm opacity-70">{total.toLocaleString()} items</div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
                        <div className="min-w-[6rem] text-center text-sm">Page {page} / {totalPages}</div>
                        <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
                        <Select value={String(pageSize)} onValueChange={(v) => { setPage(1); setPageSize(parseInt(v)); }}>
                            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}/page</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>

            {/* Create dialog */}
            <CreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={(dto) => mCreate.mutate(dto, { onSuccess: () => setCreateOpen(false) })} disabled={!canWrite} />

            {/* Edit dialog */}
            <EditDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                item={editing}
                saving={mPatch.isPending}
                onSave={(id, dto) =>
                    mPatch.mutate(
                        { id, dto },
                        {
                            onSuccess: () => {
                                setEditOpen(false);
                                toast.success("Menu item updated");
                            },
                        }
                    )
                }
                disabled={!canWrite}
            />
        </Card>
    );
}

import { useMenuCategories as useMenuCats } from "@/domain/menu/hooks";

function CreateDialog({ open, onOpenChange, onCreate, disabled }: {
    open: boolean; onOpenChange: (v: boolean) => void; onCreate: (dto: CreateMenuItemDto) => void; disabled: boolean;
}) {
    const categoriesQuery = useMenuCats();
    const categories = categoriesQuery.data ?? [];
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("0.00");
    const [category, setCategory] = useState<string>("");

    useEffect(() => {
        if (!open) { setName(""); setDescription(""); setPrice("0.00"); setCategory(""); }
    }, [open]);

    const canSubmit =
        name.trim().length > 0 &&
        description.trim().length > 0 &&
        Number(price) > 0 &&
        category.trim().length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Menu Item</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                    <div className="grid gap-2">
                        <Label>Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Description</Label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a short description" />
                        {description.trim().length === 0 && (
                            <span className="text-xs text-red-500">Description is required</span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label>Price</Label>
                            <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Category</Label>
                            <Select value={category || "_none_"} onValueChange={(v) => setCategory(v === "_none_" ? "" : v)}>
                                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_none_">Select…</SelectItem>
                                    {categories.filter(c => c && c.trim() !== "").map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        disabled={!canSubmit || disabled}
                        onClick={() => onCreate({ name: name.trim(), description: description.trim(), price: Number(price), category: category.trim() })}
                    >
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EditDialog({ open, onOpenChange, item, onSave, saving, disabled }: {
    open: boolean; onOpenChange: (v: boolean) => void; item: MenuItemDto | null; onSave: (id: string, dto: UpdateMenuItemDto) => void; saving?: boolean; disabled: boolean;
}) {
    const categoriesQuery = useMenuCats();
    const categories = categoriesQuery.data ?? [];
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("0.00");
    const [category, setCategory] = useState<string>("");

    useEffect(() => {
        if (open && item) {
            setName(item.name ?? "");
            setDescription(item.description ?? "");
            setPrice(String(item.price ?? 0));
            setCategory(item.category ?? "");
        }
    }, [open, item]);

    const canSubmit = !!item && name.trim().length > 0 && Number(price) > 0 && category.trim().length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Menu Item</DialogTitle>
                </DialogHeader>
                {!item ? (
                    <div>Loading…</div>
                ) : (
                    <div className="grid gap-3 py-2">
                        <div className="grid gap-2">
                            <Label>Name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Description</Label>
                            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label>Price</Label>
                                <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Category</Label>
                                <Select value={category || "_none_"} onValueChange={(v) => setCategory(v === "_none_" ? "" : v)}>
                                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none_">Select…</SelectItem>
                                        {categories.filter(c => c && c.trim() !== "").map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button disabled={!canSubmit || disabled || !!saving} onClick={() => item && onSave(item.id, { name: name.trim(), description: description.trim() || undefined, price: Number(price), category: category.trim() })}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
