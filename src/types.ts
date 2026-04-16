export interface Word {
  id: string;
  word: string;
  definition: string;
  ipa: string;
  example: string;
  pos: string;
  sourceUrl?: string;
  context?: string;
  savedAt: string;
  lang: string;
}

export interface DictionaryResult {
  exists: boolean;
  word: string;
  results: Array<{
    meanings: Array<{
      definition: string;
      definition_lang: string;
      example: string;
      pos: string;
    }>;
    pronunciations: Array<{ ipa: string }>;
    relations: Array<{
      related_word: string;
      relation_type: string;
    }>;
  }>;
}
