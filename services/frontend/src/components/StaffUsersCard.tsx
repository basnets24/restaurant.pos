import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Users } from "../services/identity.users";
import type { Paged, UserListItemDto } from "../services/types";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Users as UsersIcon } from "lucide-react";

export default function StaffUsersCard() {
    // Filters & paging
    const [username, setUsername] = useState("");
    const [role, setRole] = useState<string | undefined>(undefined);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // Data
    const roles = useQuery({ queryKey: ["roles", "all"], queryFn: Users.roles.all });
    const queryKey = useMemo(() => ["users", { username, role, page, pageSize }], [username, role, page, pageSize]);
    const { data, isLoading, refetch } = useQuery<Paged<UserListItemDto>>({
        queryKey,
        queryFn: () => Users.list({ username, role, page, pageSize }),
        placeholderData: keepPreviousData,
    });

    const items = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2"><UsersIcon className="h-5 w-5" /> Staff Users</CardTitle>
                    <CardDescription>Manage users from your Identity service</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Input
                        placeholder="Search username/email/name"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-64"
                    />
                    <Select
                        value={role ?? "all"}
                        onValueChange={(v) => setRole(v === "all" ? undefined : v)}
                    >
                        <SelectTrigger><SelectValue placeholder="All roles" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All roles</SelectItem>  {/* ✅ non-empty */}
                            {roles.data?.map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={() => { setPage(1); refetch(); }}>Filter</Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="rounded-2xl border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Roles</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>
                            )}
                            {!isLoading && items.length === 0 && (
                                <TableRow><TableCell colSpan={5}>No users</TableCell></TableRow>
                            )}
                            {items.map((u) => (
                                <TableRow key={u.id}>
                                    <TableCell>
                                        <div className="font-medium">{u.displayName || u.userName || "(no name)"}</div>
                                        <div className="text-xs opacity-70">{u.userName}</div>
                                    </TableCell>
                                    <TableCell>{u.email ?? "—"}</TableCell>
                                    <TableCell>
                                        {u.roles.length === 0 ? "—" : (
                                            <div className="flex flex-wrap gap-1">
                                                {u.roles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>{u.lockedOut ? "Locked" : "Active"}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {/* Hook up edit sheet later if desired */}
                                        {/* <Button size="sm" variant="outline" onClick={() => openEdit(u.id)}>Edit</Button> */}
                                        <Button size="sm" variant="destructive" onClick={async () => {
                                            await Users.disable(u.id);
                                            refetch();
                                        }}>Disable</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-sm opacity-70">{total.toLocaleString()} users</div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                        <div className="min-w-[6rem] text-center text-sm">Page {page} / {totalPages}</div>
                        <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
                        <Select value={String(pageSize)} onValueChange={(v) => { setPage(1); setPageSize(parseInt(v)); }}>
                            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}/page</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
