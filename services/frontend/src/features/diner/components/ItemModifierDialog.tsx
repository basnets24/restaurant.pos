import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { PublicMenuItemDto, PublicModifierGroupDto } from "@/domain/publicMenu";
import {
  defaultSelections,
  toSelections,
  unitPriceFor,
  type DinerCartSelection,
} from "../cart/dinerCartTypes";
import { money } from "../money";

export interface ItemModifierDialogProps {
  item: PublicMenuItemDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (selections: DinerCartSelection[], notes: string, quantity: number) => void;
}

export function ItemModifierDialog({ item, open, onOpenChange, onAdd }: ItemModifierDialogProps) {
  const [selections, setSelections] = useState<DinerCartSelection[]>([]);
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Reset per opening, not per item change, so reopening the same item starts clean.
  useEffect(() => {
    if (open && item) {
      setSelections(defaultSelections(item));
      setNotes("");
      setQuantity(1);
    }
  }, [open, item]);

  const isSelected = (optionId: string) => selections.some((s) => s.optionId === optionId);

  const toggle = (group: PublicModifierGroupDto, optionId: string) => {
    const option = group.options.find((o) => o.id === optionId);
    if (!option) return;

    setSelections((current) => {
      const withoutThisGroup = current.filter((s) => s.groupId !== group.id);

      if (group.selectionType === "Single") {
        // Re-picking the active option in an optional group clears it; in a required group
        // it stays, because "no choice" isn't a valid state there.
        if (isSelected(optionId)) return group.required ? current : withoutThisGroup;
        return [...withoutThisGroup, ...toSelections(group, [option])];
      }

      return isSelected(optionId)
        ? current.filter((s) => s.optionId !== optionId)
        : [...current, ...toSelections(group, [option])];
    });
  };

  const unitPrice = useMemo(
    () => (item ? unitPriceFor(item.price, selections) : 0),
    [item, selections]
  );

  // A required group with nothing chosen blocks the add - otherwise the kitchen gets an
  // order with no size on it.
  const missingRequired = useMemo(
    () =>
      (item?.modifierGroups ?? []).filter(
        (g) => g.required && !selections.some((s) => s.groupId === g.id)
      ),
    [item, selections]
  );

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[19px]">{item.name}</DialogTitle>
          <DialogDescription className="font-numeric">{money(item.price)}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {item.modifierGroups.map((group) => (
            <div key={group.id}>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-[13px] font-semibold">{group.name}</p>
                <span className="text-[12px] text-muted-foreground">
                  {group.required ? "Required" : group.selectionType === "Multi" ? "Optional · choose any" : "Optional"}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {group.options.map((option) => {
                  const active = isSelected(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role={group.selectionType === "Single" ? "radio" : "checkbox"}
                      aria-checked={active}
                      onClick={() => toggle(group, option.id)}
                      className={[
                        "flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40",
                      ].join(" ")}
                    >
                      <span>{option.name}</span>
                      <span className="font-numeric text-[13px] text-muted-foreground">
                        {option.priceDelta === 0
                          ? "Included"
                          : `${option.priceDelta > 0 ? "+" : "−"}${money(Math.abs(option.priceDelta))}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <label htmlFor="diner-item-notes" className="text-[13px] font-semibold">
              Special instructions
            </label>
            <Textarea
              id="diner-item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. no onions"
              className="mt-2 h-16 resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold">Quantity</span>
            <QuantityStepper value={quantity} onChange={setQuantity} />
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={missingRequired.length > 0}
            onClick={() => onAdd(selections, notes, quantity)}
          >
            {missingRequired.length > 0
              ? `Choose ${missingRequired[0].name.toLowerCase()}`
              : `Add to Order • ${money(unitPrice * quantity)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="h-7 w-7 rounded-full border border-primary/40 text-primary flex items-center justify-center disabled:opacity-40 hover:bg-primary/10"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="font-numeric w-6 text-center text-sm">{value}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(value + 1)}
        className="h-7 w-7 rounded-full border border-primary/40 text-primary flex items-center justify-center hover:bg-primary/10"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
