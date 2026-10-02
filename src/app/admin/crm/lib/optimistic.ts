// 낙관적 업데이트: 화면을 먼저 바꾸고, 저장이 실패하면 되돌린다.

interface OptimisticUpdate {
  apply: () => void;
  revert: () => void;
  request: () => Promise<Response>;
  /** 기본값은 alert — CRM 화면의 기존 실패 알림 관례를 따른다. */
  onError?: () => void;
  failMessage?: string;
}

/** 저장에 성공하면 true. 실패(비정상 응답·네트워크 예외)면 revert 후 false. */
export async function optimisticUpdate({
  apply,
  revert,
  request,
  onError,
  failMessage = '저장에 실패했습니다. 변경을 되돌립니다.',
}: OptimisticUpdate): Promise<boolean> {
  apply();
  let ok = false;
  try {
    ok = (await request()).ok;
  } catch (e) {
    console.error('[optimisticUpdate]', e);
  }
  if (!ok) {
    revert();
    (onError ?? (() => alert(failMessage)))();
  }
  return ok;
}
