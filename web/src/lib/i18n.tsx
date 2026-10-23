"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { copy, DEFAULT_LANG, type Lang } from "./copy";

type LangContextValue = {
  setLanguage: any;
  language: Language; lang: Lang; setLang: (lang: Lang) => void 
};

const LangContext = createContext<LangContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  function setLang(next: Lang) {
    setLangState(next);
    document.documentElement.lang = next;
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

export function useCopy() {
  const { lang } = useLang();
  return copy[lang];
}