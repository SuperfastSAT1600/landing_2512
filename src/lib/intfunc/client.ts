/**
 * IntelligentFunctions 클라이언트와 이 저장소가 쓰는 키들.
 *
 * `INTFUNC_API_KEY`는 프로젝트 하나에 묶인다 — 다른 프로젝트의 slug를 넘기면
 * `NotFoundError`가 돌아온다(존재 여부조차 알려주지 않는다). 그래서 project slug는
 * 키와 짝이고, 둘 다 env로 받는다.
 *
 * 기본 데이터셋 slug가 `sales-calls`가 아닌 이유: 그 이름은 external dataset이 이미
 * 물고 있다. 같은 프로젝트에서 같은 slug로 internal dataset을 만들면 400이다 (REQ-201).
 */
import { IntelligentFunctions } from '@intfunc/sdk';

const DEFAULT_DATASET_SLUG = 'sales-call-corpus';

/** env 하나가 비어 있다는 사실. 화면에 그대로 띄울 수 있는 유일한 실패다 — 우리가 쓴 문장이다. */
export class MissingEnvError extends Error {
  constructor(readonly variable: string) {
    super(`${variable}이(가) 설정되지 않았다. .env.local을 확인할 것.`);
    this.name = 'MissingEnvError';
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new MissingEnvError(name);
  return value;
}

export function intfuncClient(): IntelligentFunctions {
  return new IntelligentFunctions({ apiKey: required('INTFUNC_API_KEY') });
}

/** 데이터셋 자체의 slug — `createDataset`이 받는 것은 프로젝트 없는 이 이름이다. */
export function datasetSlug(): string {
  return process.env.INTFUNC_DATASET_SLUG || DEFAULT_DATASET_SLUG;
}

/** `projectSlug/datasetSlug` — dataset 핸들이 받는 키. */
export function datasetKey(): string {
  return `${required('INTFUNC_PROJECT_SLUG')}/${datasetSlug()}`;
}
