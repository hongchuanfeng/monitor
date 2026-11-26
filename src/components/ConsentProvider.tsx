"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ConsentState = {
  /** undefined = 尚未选择；true = 接受全部；false = 仅必要 */
  choice: boolean | undefined;
  /** 是否允许加载个性化广告 */
  personalized: boolean;
  /** 是否已做出选择 */
  decided: boolean;
  acceptAll: () => void;
  essentialOnly: () => void;
  setPreference: (personalized: boolean) => void;
};

const ConsentContext = createContext<ConsentState>({
  choice: undefined,
  personalized: false,
  decided: false,
  acceptAll: () => {},
  essentialOnly: () => {},
  setPreference: () => {},
});

const STORAGE_KEY = "monitor-protocol-consent";

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoice] = useState<boolean | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "all") setChoice(true);
      else if (raw === "essential") setChoice(false);
    } catch {
      // 隐私模式下 localStorage 不可用，忽略
    }
    setReady(true);
  }, []);

  const persist = useCallback((value: "all" | "essential") => {
    setChoice(value === "all");
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // 忽略写入失败
    }
  }, []);

  const value: ConsentState = {
    choice,
    personalized: choice === true,
    decided: ready && choice !== undefined,
    acceptAll: () => persist("all"),
    essentialOnly: () => persist("essential"),
    setPreference: (personalized: boolean) =>
      persist(personalized ? "all" : "essential"),
  };

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent() {
  return useContext(ConsentContext);
}
