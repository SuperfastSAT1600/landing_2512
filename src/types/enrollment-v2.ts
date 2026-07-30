// V2 확장 타입 — v1 types/enrollment.ts를 건드리지 않음

export type ClassFormatV2 = 'one-on-one' | 'group' | 'content';

export type CategoryIdV2 = 'one-on-one' | 'group' | 'content' | 'unmanaged';

export interface GroupPackage {
  id: string;
  name: string;
  subtitle: string;
  totalPrice: number;
  durationLabel: string;
  salesLabel?: 'popular' | 'bestValue' | 'new';
}

export type OptionSelectionV2 =
  | { type: 'hour-package'; packageId: string }
  | { type: 'group-package'; packageId: string }
  | { type: 'content'; contentIds: string[] };

export interface ClassFormatV2Option {
  id: ClassFormatV2;
  name: string;
  description: string;
  icon: string;
  recommended?: boolean;
}
