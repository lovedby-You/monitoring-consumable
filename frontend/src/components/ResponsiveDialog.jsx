import { X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';

export default function ResponsiveDialog({ open, onOpenChange, title, description, children }) {
  const desktop = useMediaQuery('(min-width: 640px)');
  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description || ' '}</DialogDescription>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" aria-hidden />
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>
        <SheetTitle className="pr-8">{title}</SheetTitle>
        <SheetDescription className="mb-4 mt-1 text-muted-foreground">
          {description || ' '}
        </SheetDescription>
        {children}
      </SheetContent>
    </Sheet>
  );
}
