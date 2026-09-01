/**
 * IntelligentFunctions 클라이언트와 이 저장소가 쓰는 키들.
 *
 * `INTFUNC_API_KEY`는 프로젝트 하나에 묶인다 — 다른 프로젝트의 slug를 넘기면
 * `NotFoundError`가 돌아온다(존재 여부조차 알려주지 않는다). 그래서 project slug는
 * 키와 짝이고, 둘 다 env로 받는다.
 */
import { IntelligentFunctions } from '@intfunc/sdk';

const DEFAULT_DATASET_SLUG = 'sales-calls';
const DEFAULT_PACK_SLUG = 'sales-call-conversion';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name}이(가) 설정되지 않았다. .env.local을 확인할 것.`);
  return value;
}

export function intfuncClient(): IntelligentFunctions {
  return new IntelligentFunctions({ apiKey: required('INTFUNC_API_KEY') });
}

/** `projectSlug/datasetSlug` — external dataset 핸들이 받는 키. */
export function datasetKey(): string {
  const project = required('INTFUNC_PROJECT_SLUG');
  return `${project}/${process.env.INTFUNC_DATASET_SLUG || DEFAULT_DATASET_SLUG}`;
}

export function packSlug(): string {
  return process.env.INTFUNC_PACK_SLUG || DEFAULT_PACK_SLUG;
}
