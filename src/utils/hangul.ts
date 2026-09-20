/**
 * Korean Hangul syllable decomposition & stroke counting utility.
 * Adheres to standard Korean typing test metrics (한컴타자 스타일 타수 계산).
 */

const CHOSUNG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

const JUNGSUNG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'
];

const JONGSUNG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

// Complex jamo stroke counts
const JAMO_STROKE_MAP: Record<string, number> = {
  // Chosung / simple
  'ㄱ': 1, 'ㄴ': 1, 'ㄷ': 1, 'ㄹ': 1, 'ㅁ': 1, 'ㅂ': 1, 'ㅅ': 1, 'ㅇ': 1,
  'ㅈ': 1, 'ㅊ': 1, 'ㅋ': 1, 'ㅌ': 1, 'ㅍ': 1, 'ㅎ': 1,
  'ㄲ': 2, 'ㄸ': 2, 'ㅃ': 2, 'ㅆ': 2, 'ㅉ': 2,
  // Jungsung
  'ㅏ': 1, 'ㅐ': 1, 'ㅑ': 1, 'ㅒ': 2, 'ㅓ': 1, 'ㅔ': 1, 'ㅕ': 1, 'ㅖ': 2,
  'ㅗ': 1, 'ㅘ': 2, 'ㅙ': 2, 'ㅚ': 2, 'ㅛ': 1, 'ㅜ': 1, 'ㅝ': 2, 'ㅞ': 2,
  'ㅟ': 2, 'ㅠ': 1, 'ㅡ': 1, 'ㅢ': 2, 'ㅣ': 1,
  // Jongsung compounds
  'ㄳ': 2, 'ㄵ': 2, 'ㄶ': 2, 'ㄺ': 2, 'ㄻ': 2, 'ㄼ': 2, 'ㄽ': 2, 'ㄾ': 2,
  'ㄿ': 2, 'ㅀ': 2, 'ㅄ': 2,
};

export interface DecomposedChar {
  char: string;
  isHangul: boolean;
  chosung?: string;
  jungsung?: string;
  jongsung?: string;
  strokes: number;
}

export function decomposeChar(char: string): DecomposedChar {
  if (!char) return { char: '', isHangul: false, strokes: 0 };

  const code = char.charCodeAt(0);

  // Complete Hangul syllable range (AC00 - D7A3)
  if (code >= 0xac00 && code <= 0xd7a3) {
    const diff = code - 0xac00;
    const jongIndex = diff % 28;
    const jungIndex = Math.floor((diff / 28) % 21);
    const choIndex = Math.floor(diff / (28 * 21));

    const cho = CHOSUNG[choIndex];
    const jung = JUNGSUNG[jungIndex];
    const jong = JONGSUNG[jongIndex];

    const choStrokes = JAMO_STROKE_MAP[cho] || 1;
    const jungStrokes = JAMO_STROKE_MAP[jung] || 1;
    const jongStrokes = jong ? (JAMO_STROKE_MAP[jong] || 1) : 0;

    return {
      char,
      isHangul: true,
      chosung: cho,
      jungsung: jung,
      jongsung: jong,
      strokes: choStrokes + jungStrokes + jongStrokes,
    };
  }

  // Compatibility Jamo range (3131 - 318E)
  if (code >= 0x3131 && code <= 0x318e) {
    return {
      char,
      isHangul: true,
      strokes: JAMO_STROKE_MAP[char] || 1,
    };
  }

  // Symbols requiring shift key
  const shiftSymbols = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '{', '}', '|', ':', '"', '<', '>', '?', '~'];
  if (shiftSymbols.includes(char) || (char >= 'A' && char <= 'Z')) {
    return { char, isHangul: false, strokes: 2 };
  }

  // Normal character / whitespace
  return {
    char,
    isHangul: false,
    strokes: 1,
  };
}

/**
 * Calculates total strokes for a string
 */
export function countTotalStrokes(str: string): number {
  let strokes = 0;
  for (let i = 0; i < str.length; i++) {
    strokes += decomposeChar(str[i]).strokes;
  }
  return strokes;
}

/**
 * Compares typed character with target character and returns correct strokes
 */
export function compareCharAccuracy(targetChar: string, typedChar: string): {
  isExact: boolean;
  correctStrokes: number;
  totalTargetStrokes: number;
} {
  const targetDec = decomposeChar(targetChar);
  if (!typedChar) {
    return { isExact: false, correctStrokes: 0, totalTargetStrokes: targetDec.strokes };
  }

  if (targetChar === typedChar) {
    return { isExact: true, correctStrokes: targetDec.strokes, totalTargetStrokes: targetDec.strokes };
  }

  const typedDec = decomposeChar(typedChar);

  // If both are Hangul syllables, partial match gives proportional strokes
  if (targetDec.isHangul && typedDec.isHangul && targetDec.chosung && typedDec.chosung) {
    let matched = 0;
    if (targetDec.chosung === typedDec.chosung) {
      matched += JAMO_STROKE_MAP[targetDec.chosung] || 1;
    }
    if (targetDec.jungsung === typedDec.jungsung) {
      matched += (targetDec.jungsung ? JAMO_STROKE_MAP[targetDec.jungsung] || 1 : 0);
    }
    if (targetDec.jongsung && targetDec.jongsung === typedDec.jongsung) {
      matched += JAMO_STROKE_MAP[targetDec.jongsung] || 1;
    }
    return {
      isExact: false,
      correctStrokes: matched,
      totalTargetStrokes: targetDec.strokes,
    };
  }

  return { isExact: false, correctStrokes: 0, totalTargetStrokes: targetDec.strokes };
}
