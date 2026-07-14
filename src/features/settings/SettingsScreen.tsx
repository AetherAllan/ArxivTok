import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Check from "lucide-react-native/icons/check";
import Info from "lucide-react-native/icons/info";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import { useTranslation } from "react-i18next";
import { SectionFrame } from "@/features/menu/SectionFrame";
import type { UiLangPref } from "@/i18n";
import type { TranslateLangPref } from "@/lib/storage";
import { colors, radii } from "@/shared/theme";
import type { AppSection } from "@/types/navigation";
import { ProviderSettings } from "./ProviderSettings";
import type { useProviderProfiles } from "./useProviderProfiles";

const TRANSLATE_OPTIONS: { id: TranslateLangPref; labelKey: string }[] = [
  { id: "system", labelKey: "settings.tlSystem" },
  { id: "en", labelKey: "settings.tlEn" },
  { id: "zh-CN", labelKey: "settings.tlZhCN" },
  { id: "zh-TW", labelKey: "settings.tlZhTW" },
  { id: "ja", labelKey: "settings.tlJa" },
  { id: "ko", labelKey: "settings.tlKo" },
  { id: "es", labelKey: "settings.tlEs" },
  { id: "fr", labelKey: "settings.tlFr" },
  { id: "de", labelKey: "settings.tlDe" },
  { id: "pt", labelKey: "settings.tlPt" },
  { id: "ru", labelKey: "settings.tlRu" },
  { id: "ar", labelKey: "settings.tlAr" },
  { id: "hi", labelKey: "settings.tlHi" },
];

const UI_LANG_OPTIONS: { id: UiLangPref; labelKey: string }[] = [
  { id: "system", labelKey: "settings.langSystem" },
  { id: "en", labelKey: "settings.langEn" },
  { id: "zh", labelKey: "settings.langZh" },
];

type Props = {
  visible: boolean;
  section: SettingsSection;
  uiLang: UiLangPref;
  translateLang: TranslateLangPref;
  onUiLangChange: (lang: UiLangPref) => void;
  onTranslateLangChange: (lang: TranslateLangPref) => void;
  onReset: () => void;
  onBack: () => void;
  providerManager: ReturnType<typeof useProviderProfiles>;
};

export type SettingsSection = Extract<
  AppSection,
  "translation" | "language" | "about"
>;

export function SettingsScreen({
  visible,
  section,
  uiLang,
  translateLang,
  onUiLangChange,
  onTranslateLangChange,
  onReset,
  onBack,
  providerManager,
}: Props) {
  const { t } = useTranslation();
  const title = t(
    section === "translation"
      ? "menu.translation"
      : section === "language"
        ? "menu.language"
        : "settings.about",
  );

  return (
    <SectionFrame visible={visible} title={title} onBackComplete={onBack}>
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {section === "language" ? (
            <>
              <Text style={styles.section}>{t("settings.appLanguage")}</Text>
              <Text style={styles.hint}>{t("settings.appLanguageHint")}</Text>
              <View style={styles.optionGroup}>
                {UI_LANG_OPTIONS.map((opt) => {
                  const active = opt.id === uiLang;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => onUiLangChange(opt.id)}
                      style={({ pressed }) => [
                        styles.row,
                        active && styles.rowActive,
                        pressed && styles.rowPressed,
                      ]}
                    >
                      <Text style={styles.rowLabel}>{t(opt.labelKey)}</Text>
                      {active ? (
                        <Check color={colors.text} size={18} strokeWidth={2} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {section === "translation" ? (
            <>
              <Text style={styles.section}>{t("settings.translationLanguage")}</Text>
              <Text style={styles.hint}>{t("settings.translationHint")}</Text>
              <View style={styles.optionGroup}>
                {TRANSLATE_OPTIONS.map((option) => {
                  const active = option.id === translateLang;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => onTranslateLangChange(option.id)}
                      style={({ pressed }) => [
                        styles.row,
                        active && styles.rowActive,
                        pressed && styles.rowPressed,
                      ]}
                    >
                      <Text style={styles.rowLabel}>{t(option.labelKey)}</Text>
                      {active ? (
                        <Check color={colors.text} size={18} strokeWidth={2} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
              <ProviderSettings manager={providerManager} />
            </>
          ) : null}

          {section === "about" ? (
            <>
              <View style={styles.aboutBox}>
                <View style={styles.aboutHeading}>
                  <Info color={colors.text} size={21} strokeWidth={1.8} />
                  <View>
                    <Text style={styles.aboutTitle}>ArxivTok</Text>
                    <Text style={styles.aboutBody}>
                      {t("settings.version", { version: "1.0.0" })}
                    </Text>
                  </View>
                </View>
                <Text style={styles.aboutBody}>{t("settings.aboutBody1")}</Text>
                <Text style={styles.aboutBody}>{t("settings.aboutBody2")}</Text>
              </View>

              <Pressable
                onPress={onReset}
                style={({ pressed }) => [
                  styles.resetBtn,
                  pressed && styles.resetPressed,
                ]}
              >
                <RotateCcw color={colors.danger} size={17} strokeWidth={1.8} />
                <Text style={styles.resetText}>{t("settings.reset")}</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </View>
    </SectionFrame>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  section: {
    color: colors.dim,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginLeft: 4,
  },
  hint: {
    color: colors.dim,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
    marginHorizontal: 4,
  },
  optionGroup: {
    overflow: "hidden",
    marginBottom: 18,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.medium,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    minHeight: 48,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowActive: {
    backgroundColor: colors.surfacePressed,
  },
  rowPressed: { opacity: 0.82 },
  rowLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
  },
  aboutBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.medium,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  aboutHeading: { flexDirection: "row", alignItems: "center", gap: 12 },
  aboutTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  aboutBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  resetBtn: {
    marginTop: 28,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.medium,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  resetPressed: {
    opacity: 0.85,
  },
  resetText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "600",
  },
});
