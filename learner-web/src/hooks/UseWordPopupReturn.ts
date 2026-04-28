// hooks/useWordPopup.ts
import { useState } from "react";
import handleAPI from "@/apis/handleAPI";
import type { ILessonWordResponse } from "@/types";
import type { IWordData } from "@/types/dictionary";

interface UseWordPopupReturn {
  activeWord: ILessonWordResponse | null;
  anchorEl: HTMLElement | null;
  wordData: IWordData | null;
  loadingWordData: boolean;
  handleWordClick: (word: ILessonWordResponse, el: HTMLElement, context: string) => Promise<void>;
  closePopup: () => void;
}

export const useWordPopup = (): UseWordPopupReturn => {
  const [activeWord, setActiveWord] = useState<ILessonWordResponse | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [wordData, setWordData] = useState<IWordData | null>(null);
  const [loadingWordData, setLoadingWordData] = useState(false);

  const handleWordClick = async (word: ILessonWordResponse, el: HTMLElement, context: string) => {
    // Nếu click vào cùng từ thì không làm gì
    if (activeWord?.id === word.id) {
      return;
    }
    
    setActiveWord(word);
    setAnchorEl(el);
    setLoadingWordData(true);
    setWordData(null);

    try {
      const res = await handleAPI<IWordData>({
        endpoint: "/dictionaries/words",
        method: "POST",
        body: {
          text: word.wordText || word.wordNormalized || "",
          context: context,
          isFallback: true,
          posTag: word.posTag,
          entityType: word.entityType,
          lemma: word.lemma,
        }
      });
      setWordData(res);
    } catch (e) {
      setWordData(null);
    } finally {
      setLoadingWordData(false);
    }
  };

  const closePopup = () => {
    setActiveWord(null);
    setAnchorEl(null);
  };

  return {
    activeWord,
    anchorEl,
    wordData,
    loadingWordData,
    handleWordClick,
    closePopup,
  };
};