import React, { useEffect } from 'react';
import { useLanguageStore } from './src/store/languageStore';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const loadLanguage = useLanguageStore(s => s.loadLanguage);

  useEffect(() => {
    loadLanguage();
  }, []);

  return <AppNavigator />;
}
