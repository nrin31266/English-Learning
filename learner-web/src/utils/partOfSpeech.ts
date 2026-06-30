export const PART_OF_SPEECH = [
  "NOUN", "PROPN", "VERB", "AUX", "ADJ", "ADV", "PRON", "DET", "ADP",
  "CCONJ", "SCONJ", "NUM", "PART", "INTJ", "PUNCT", "SYM",
  "PHRASE", "PHRASAL_VERB", "COLLOCATION", "IDIOM", "FIXED_EXPRESSION", "OTHER",
] as const;

export type CanonicalPartOfSpeech = (typeof PART_OF_SPEECH)[number];

const POS_ALIASES: Record<string, CanonicalPartOfSpeech> = {
  N: "NOUN", NN: "NOUN", NNS: "NOUN", NOUN: "NOUN",
  NNP: "PROPN", NNPS: "PROPN", PROPN: "PROPN", PROPER_NOUN: "PROPN",
  V: "VERB", VB: "VERB", VBD: "VERB", VBG: "VERB", VBN: "VERB", VBP: "VERB", VBZ: "VERB", VERB: "VERB",
  MD: "AUX", AUX: "AUX", AUXILIARY: "AUX", MODAL: "AUX",
  A: "ADJ", JJ: "ADJ", JJR: "ADJ", JJS: "ADJ", ADJ: "ADJ", ADJECTIVE: "ADJ",
  R: "ADV", RB: "ADV", RBR: "ADV", RBS: "ADV", WRB: "ADV", ADV: "ADV", ADVERB: "ADV",
  PRP: "PRON", PRP$: "PRON", WP: "PRON", WP$: "PRON", PRON: "PRON", PRONOUN: "PRON",
  DT: "DET", PDT: "DET", WDT: "DET", DET: "DET", DETERMINER: "DET", ARTICLE: "DET",
  IN: "ADP", ADP: "ADP", PREP: "ADP", PREPOSITION: "ADP",
  CC: "CCONJ", CONJ: "CCONJ", CCONJ: "CCONJ", CONJUNCTION: "CCONJ",
  SCONJ: "SCONJ", SUBORDINATING_CONJUNCTION: "SCONJ",
  CD: "NUM", NUM: "NUM", NUMERAL: "NUM", NUMBER: "NUM",
  POS: "PART", RP: "PART", TO: "PART", PART: "PART", PARTICLE: "PART",
  UH: "INTJ", INT: "INTJ", INTJ: "INTJ", INTERJECTION: "INTJ",
  PUNCT: "PUNCT", PUNCTUATION: "PUNCT", SYM: "SYM", SYMBOL: "SYM",
  PHRASE: "PHRASE", PHR: "PHRASE",
  PHRASAL_VERB: "PHRASAL_VERB", PHRASALVERB: "PHRASAL_VERB", PHR_V: "PHRASAL_VERB",
  COLLOCATION: "COLLOCATION", COLLOC: "COLLOCATION",
  IDIOM: "IDIOM", IDIOMATIC_EXPRESSION: "IDIOM",
  FIXED_EXPRESSION: "FIXED_EXPRESSION", FIXED_PHRASE: "FIXED_EXPRESSION",
  X: "OTHER", FW: "OTHER", UNKNOWN: "OTHER", OTHER: "OTHER",
};

function normalizeAlias(value: string): string {
  return value.trim().toUpperCase().replace(/[\s./-]+/g, "_");
}

/** Normalize backend/spaCy/Penn Treebank/API values before translating them. */
export function normalizePartOfSpeech(value?: string | null): CanonicalPartOfSpeech {
  if (!value) return "OTHER";
  return POS_ALIASES[normalizeAlias(value)] ?? "OTHER";
}

export function getPartOfSpeechI18nKey(value?: string | null): `partOfSpeech.${CanonicalPartOfSpeech}` {
  return `partOfSpeech.${normalizePartOfSpeech(value)}`;
}
