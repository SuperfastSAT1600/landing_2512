import type { ProductCategory, ProductSubcategory } from '@/types/crm';

export type ClassType = '1:1' | '1:2' | '그룹' | '콘텐츠';
export type Subject = 'SAT' | 'AP';

export interface Product {
  id: string;
  label: string;
  requiresHours: boolean;
  category: ProductCategory;
  subcategory: ProductSubcategory;
}

export const PRODUCT_TREE: Record<ClassType, Partial<Record<Subject | '_', Product[]>>> = {
  '1:1': {
    SAT: [
      { id: 'sat_1on1_managed',  label: 'SAT 정규 1:1 수업 (관리형)',  requiresHours: true,  category: 'SAT 정규 1:1 수업', subcategory: '관리형 수업' },
      { id: 'sat_1on1_onepoint', label: 'SAT 정규 1:1 수업 (원포인트)', requiresHours: true,  category: 'SAT 정규 1:1 수업', subcategory: '원포인트' },
      { id: 'sat_1on1_lead',     label: 'SAT 정규 1:1 수업 (대표코치)', requiresHours: true,  category: 'SAT 정규 1:1 수업', subcategory: '대표코치' },
      { id: 'sat_1on1_selfled',  label: 'SAT 정규 1:1 수업 (자기주도형)', requiresHours: true,  category: 'SAT 정규 1:1 수업', subcategory: '자기주도형' },
      { id: 'sat_trial',         label: 'SAT 체험 1:1 수업',            requiresHours: false, category: 'SAT 체험 1:1 수업', subcategory: '체험수업' },
    ],
    AP: [
      { id: 'ap_1on1', label: 'AP 정규 1:1 수업', requiresHours: true, category: 'AP 정규 1:1 수업', subcategory: '관리형 수업' },
    ],
  },
  '1:2': {
    SAT: [
      { id: 'sat_1on2_managed',  label: 'SAT 정규 1:2 수업 (관리형)',  requiresHours: true,  category: 'SAT 정규 1:2 수업', subcategory: '관리형 수업' },
      { id: 'sat_1on2_onepoint', label: 'SAT 정규 1:2 수업 (원포인트)', requiresHours: true,  category: 'SAT 정규 1:2 수업', subcategory: '원포인트' },
      { id: 'sat_trial_1on2',    label: 'SAT 체험 1:2 수업',            requiresHours: false, category: 'SAT 체험 1:2 수업', subcategory: '체험수업' },
    ],
    AP: [
      { id: 'ap_1on2', label: 'AP 정규 1:2 수업', requiresHours: true, category: 'AP 정규 1:2 수업', subcategory: '관리형 수업' },
    ],
  },
  '그룹': {
    SAT: [
      { id: 'sat_group',         label: 'SAT 정규 그룹 수업 (여름방학 특강)', requiresHours: false, category: 'SAT 정규 그룹 수업', subcategory: '여름방학 특강' },
      { id: 'sat_group_chuseok', label: 'SAT 정규 그룹 수업 (추석특강)',     requiresHours: false, category: 'SAT 정규 그룹 수업', subcategory: '추석특강' },
    ],
  },
  '콘텐츠': {
    _: [
      { id: 'content_vocab',     label: '단어학습',   requiresHours: false, category: '관리형 콘텐츠', subcategory: '단어학습' },
      { id: 'content_supertest', label: 'SuperTest', requiresHours: false, category: '관리형 콘텐츠', subcategory: 'SuperTest' },
      { id: 'content_lecture',   label: '인강',       requiresHours: false, category: '관리형 콘텐츠', subcategory: '인강' },
    ],
  },
};

export type PaymentType = '최초결제' | '재결제';

/** 선택한 수업 유형·과목에 해당하는 상품 목록. */
export function getProducts(classType: ClassType | null, subject: Subject | null): Product[] {
  if (!classType) return [];
  if (classType === '콘텐츠') return PRODUCT_TREE['콘텐츠']._ ?? [];
  if (!subject) return [];
  return (PRODUCT_TREE[classType] as Record<Subject, Product[]>)[subject] ?? [];
}
