import { useState } from "react";
import type {
  MenuItemDto, ModifierGroupDto, ModifierSelectionType,
  UpsertModifierGroupDto, UpsertModifierOptionDto,
} from "@/domain/menu/types";
import {
  useModifierGroups, useCreateModifierGroup, useUpdateModifierGroup, useDeleteModifierGroup,
} from "@/domain/menu/hooks";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export default function ModifiersDialog({ open, onOpenChange, item, canWrite }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: MenuItemDto | null;
  canWrite: boolean;
}) {
  const menuItemId = item?.id;
  const groups = useModifierGroups(menuItemId);
  const mCreate = useCreateModifierGroup(menuItemId ?? "");
  const mUpdate = useUpdateModifierGroup(menuItemId ?? "");
  const mDelete = useDeleteModifierGroup(menuItemId ?? "");

  const [editing, setEditing] = useState<ModifierGroupDto | "new" | null>(null);

  // Drop back to the list view once the dialog closes or a different item opens.
  const [prevKey, setPrevKey] = useState(`${open}:${menuItemId ?? ""}`);
  const key = `${open}:${menuItemId ?? ""}`;
  if (key !== prevKey) {
    setPrevKey(key);
    setEditing(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifiers — {item?.name}</DialogTitle>
        </DialogHeader>

        {editing ? (
          <GroupEditor
            group={editing === "new" ? null : editing}
            saving={mCreate.isPending || mUpdate.isPending}
            onCancel={() => setEditing(null)}
            onSave={(dto) => {
              const onSuccess = () => {
                setEditing(null);
                toast.success(editing === "new" ? "Modifier group added" : "Modifier group updated");
              };
              if (editing === "new") mCreate.mutate(dto, { onSuccess });
              else mUpdate.mutate({ id: editing.id, dto }, { onSuccess });
            }}
          />
        ) : (
          <>
            <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
              {groups.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
              {!groups.isLoading && (groups.data?.length ?? 0) === 0 && (
                <div className="text-sm text-muted-foreground">No modifier groups yet.</div>
              )}
              {groups.data?.map((g) => (
                <div key={g.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{g.name}</span>
                      <Badge variant="secondary">{g.selectionType === "Single" ? "Single choice" : "Multiple choice"}</Badge>
                      {g.required && <Badge variant="outline">Required</Badge>}
                    </div>
                    {canWrite && (
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="outline" onClick={() => setEditing(g)} aria-label="Edit modifier group">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => mDelete.mutate(g.id, { onSuccess: () => toast.success("Modifier group deleted") })}
                          disabled={mDelete.isPending}
                          aria-label="Delete modifier group"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {g.options.map((o) => (
                      <li key={o.id} className="flex items-center justify-between">
                        <span>{o.name}{o.isDefault ? " · default" : ""}</span>
                        <span>{o.priceDelta === 0 ? "Included" : `${o.priceDelta > 0 ? "+" : ""}$${o.priceDelta.toFixed(2)}`}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              {canWrite && (
                <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4 mr-2" />Add group</Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GroupEditor({ group, onSave, onCancel, saving }: {
  group: ModifierGroupDto | null;
  onSave: (dto: UpsertModifierGroupDto) => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [selectionType, setSelectionType] = useState<ModifierSelectionType>(group?.selectionType ?? "Single");
  const [required, setRequired] = useState(group?.required ?? false);
  const [options, setOptions] = useState<UpsertModifierOptionDto[]>(
    group?.options.map((o) => ({ id: o.id, name: o.name, priceDelta: o.priceDelta, isDefault: o.isDefault }))
      ?? [{ name: "", priceDelta: 0, isDefault: false }]
  );

  const canSubmit = name.trim().length > 0 && options.length > 0 && options.every((o) => o.name.trim().length > 0);

  const updateOption = (index: number, patch: Partial<UpsertModifierOptionDto>) =>
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));

  return (
    <div className="grid gap-3 py-2">
      <div className="grid gap-2">
        <Label>Group name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Size, Extras, Spice level…" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label>Selection</Label>
          <Select value={selectionType} onValueChange={(v) => setSelectionType(v as ModifierSelectionType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Single">Single choice</SelectItem>
              <SelectItem value="Multi">Multiple choice</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 self-end pb-2">
          <Switch checked={required} onCheckedChange={setRequired} />
          <span className="text-sm">Required</span>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Options</Label>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                className="flex-1"
                placeholder="Option name"
                value={o.name}
                onChange={(e) => updateOption(i, { name: e.target.value })}
              />
              <Input
                type="number"
                step="0.01"
                className="w-24 text-right"
                placeholder="0.00"
                value={o.priceDelta}
                onChange={(e) => updateOption(i, { priceDelta: Number(e.target.value) })}
              />
              <div className="flex items-center gap-1 shrink-0" title="Pre-selected by default">
                <Switch checked={o.isDefault} onCheckedChange={(v) => updateOption(i, { isDefault: v })} />
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                disabled={options.length <= 1}
                aria-label="Remove option"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOptions((prev) => [...prev, { name: "", priceDelta: 0, isDefault: false }])}
        >
          <Plus className="h-4 w-4 mr-1" />Add option
        </Button>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          disabled={!canSubmit || !!saving}
          onClick={() => onSave({
            name: name.trim(),
            selectionType,
            required,
            options: options.map((o) => ({ ...o, name: o.name.trim() })),
          })}
        >
          Save
        </Button>
      </DialogFooter>
    </div>
  );
}
