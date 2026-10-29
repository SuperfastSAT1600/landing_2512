export interface TutorialState {
  index: number;
  done: boolean;
  missed: boolean;
}

export type TutorialAction =
  | { type: 'click'; targetId: string | null; targets: string[] }
  | { type: 'back' }
  | { type: 'reset' };

export const initialState: TutorialState = { index: 0, done: false, missed: false };

export function tutorialReducer(state: TutorialState, action: TutorialAction): TutorialState {
  switch (action.type) {
    case 'click': {
      if (state.done) return state;
      if (action.targetId === null || action.targetId !== action.targets[state.index]) {
        return { ...state, missed: true };
      }
      const index = state.index + 1;
      return { index, done: index >= action.targets.length, missed: false };
    }
    case 'back':
      return { index: Math.max(0, state.index - 1), done: false, missed: false };
    case 'reset':
      return initialState;
  }
}
