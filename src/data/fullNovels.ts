import dongbaek from './novels/kim-dongbaek.json';
import memil from './novels/lee-hyoseok-memil.json';
import bombom from './novels/kim-bombom.json';
import unsu from './novels/hyun-unsu.json';
import samryong from './novels/na-samryong.json';
import gamja from './novels/kim-dongin-gamja.json';
import nalgae from './novels/lee-sang-nalgae.json';
import taepyeong from './novels/chae-taepyeong.json';

export const FULL_NOVEL_SENTENCES: Record<string, string[]> = {
  'kim-dongbaek': dongbaek.sentences,
  'lee-hyoseok-memil': memil.sentences,
  'kim-bombom': bombom.sentences,
  'hyun-unsu': unsu.sentences,
  'na-samryong': samryong.sentences,
  'kim-dongin-gamja': gamja.sentences,
  'lee-sang-nalgae': nalgae.sentences,
  'chae-taepyeong': taepyeong.sentences,
};

export const PARAPHRASE_BOOK_IDS = new Set(['hyun-unsu-full', 'kim-dongbaek-full', 'lee-memil-full']);
