import dongbaek from './novels/kim-dongbaek.json';
import memil from './novels/lee-hyoseok-memil.json';
import bombom from './novels/kim-bombom.json';
import unsu from './novels/hyun-unsu.json';

export const FULL_NOVEL_SENTENCES: Record<string, string[]> = {
  'kim-dongbaek': dongbaek.sentences,
  'lee-hyoseok-memil': memil.sentences,
  'kim-bombom': bombom.sentences,
  'hyun-unsu': unsu.sentences,
};

export const PARAPHRASE_BOOK_IDS = new Set(['hyun-unsu-full', 'kim-dongbaek-full', 'lee-memil-full']);
