import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function ModifierPickerSheet({ open, onOpenChange, product, selectedIds = [], onChange }) {
  const { data: modifiers = [] } = useQuery({
    queryKey: ["product-modifiers-pos", product?.id],
    queryFn: () => base44.entities.ProductModifier.filter({ product_id: product.id }),
    enabled: !!product && open
  });

  const toggle = (id) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter(x => x !== id));
    else onChange([...selectedIds, id]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader><DialogTitle>Modifiers for {product?.name}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {modifiers.length === 0 ? (
            <p className="text-sm text-[#8B7355] text-center py-4">No modifiers available for this item</p>
          ) : (
            modifiers.map(m => {
              const active = selectedIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${active ? "border-[#8B7355] bg-[#F5EBE8]" : "border-[#E8DED8] bg-white"}`}
                >
                  <div>
                    <p className="text-sm font-medium text-[#5C4A3A]">{m.modifier_name}</p>
                    <p className="text-xs text-[#8B7355] capitalize">{m.modifier_type}</p>
                  </div>
                  {active && <Check className="h-4 w-4 text-[#8B7355]" />}
                </button>
              );
            })
          )}
        </div>
        <Button onClick={() => onOpenChange(false)} className="w-full bg-[#8B7355] hover:bg-[#6B5744] mt-2">Done</Button>
      </DialogContent>
    </Dialog>
  );
}