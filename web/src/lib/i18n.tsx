"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { copy, DEFAULT_LANG, type Lang } from "./copy";

type Language = Lang;

type LangContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
};

const LangContext = createContext<LangContextValue>({
  language: DEFAULT_LANG,
  setLanguage: () => {},
  lang: DEFAULT_LANG,
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  function setLang(next: Lang) {
    setLangState(next);
    document.documentElement.lang = next;
  }

  const value: LangContextValue = {
    lang,
    setLang,
    language: lang,
    setLanguage: setLang,
  };

  return (
    <LangContext.Provider value={value}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

export function useCopy() {
  const { lang } = useLang();
  return copy[lang];
}

