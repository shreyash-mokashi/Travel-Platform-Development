'use client';

import { Button } from '../ui/Button';

export function PrintButton({ label = 'Print or save as PDF' }: { label?: string }) {
  return (
    <Button variant="secondary" onClick={() => window.print()} className="vg-no-print">
      {label}
    </Button>
  );
}
