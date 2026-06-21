import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language, TranslationKey } from '../utils/translations';

interface LanguageStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  loadLanguage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageStore>((set, get) => ({
  language: 'en',

  setLanguage: async (lang: Language) => {
    set({ language: lang });
    try { await AsyncStorage.setItem('@app_language', lang); } catch {}
  },

  t: (key: TranslationKey) => {
    const { language } = get();
    return translations[language][key] || translations.en[key] || key;
  },

  loadLanguage: async () => {
    try {
      const saved = await AsyncStorage.getItem('@app_language');
      if (saved === 'en' || saved === 'lo') set({ language: saved });
    } catch {}
  },
}));
