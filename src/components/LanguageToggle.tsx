import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguageStore } from '../store/languageStore';
import { Colors, BorderRadius, Typography } from '../utils/theme';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.btn, language === 'en' && styles.btnActive]}
        onPress={() => setLanguage('en')}
        activeOpacity={0.8}
      >
        <Text style={[styles.btnText, language === 'en' && styles.btnTextActive]}>EN</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, language === 'lo' && styles.btnActive]}
        onPress={() => setLanguage('lo')}
        activeOpacity={0.8}
      >
        <Text style={[styles.btnText, language === 'lo' && styles.btnTextActive]}>ລາວ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius:   BorderRadius.full,
    padding:        2,
    borderWidth:    1,
    borderColor:    Colors.border,
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical:    4,
    borderRadius:      BorderRadius.full,
  },
  btnActive: {
    backgroundColor: Colors.primary,
  },
  btnText: {
    fontSize:   11,
    fontWeight: '700',
    color:      Colors.textTertiary,
  },
  btnTextActive: {
    color: '#fff',
  },
});
