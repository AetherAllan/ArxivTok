import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ExternalLink from "lucide-react-native/icons/external-link";
import Info from "lucide-react-native/icons/info";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import { useTranslation } from "react-i18next";
import { SectionFrame } from "@/features/menu/SectionFrame";
import { deviceUiLang, type UiLangPref } from "@/i18n";
import { deviceTranslateLang, type TranslateLangPref } from "@/lib/storage";
import { colors, radii } from "@/shared/theme";
import type { AppSection } from "@/types/navigation";
import { LanguagePickerField } from "./LanguagePickerField";
import { LanguagePickerSheet } from "./LanguagePickerSheet";
import type { LanguageOption } from "./languagePicker";
import { ProviderSettings } from "./ProviderSettings";
import { AskSettings } from "@/features/ask/AskSettings";
import type { useEmbeddingProfile } from "@/features/ask/useEmbeddingProfile";
import type { useProviderProfiles } from "./useProviderProfiles";
import type { useAppUpdate } from "./useAppUpdate";
import { useAppDialog } from "@/shared/AppDialog";

const TRANSLATE_OPTIONS: {
  id: TranslateLangPref;
  labelKey: string;
  keywords?: string[];
}[] = [
  { id: "system", labelKey: "settings.tlSystem" },
  { id: "en", labelKey: "settings.tlEn", keywords: ["English"] },
  {
    id: "zh-CN",
    labelKey: "settings.tlZhCN",
    keywords: ["Chinese Simplified"],
  },
  {
    id: "zh-TW",
    labelKey: "settings.tlZhTW",
    keywords: ["Chinese Traditional"],
  },
  { id: "ja", labelKey: "settings.tlJa", keywords: ["Japanese"] },
  { id: "ko", labelKey: "settings.tlKo", keywords: ["Korean"] },
  { id: "es", labelKey: "settings.tlEs", keywords: ["Spanish"] },
  { id: "fr", labelKey: "settings.tlFr", keywords: ["French"] },
  { id: "de", labelKey: "settings.tlDe", keywords: ["German"] },
  { id: "pt", labelKey: "settings.tlPt", keywords: ["Portuguese"] },
  { id: "ru", labelKey: "settings.tlRu", keywords: ["Russian"] },
  { id: "ar", labelKey: "settings.tlAr", keywords: ["Arabic"] },
  { id: "hi", labelKey: "settings.tlHi", keywords: ["Hindi"] },
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
  onReset: () => Promise<void>;
  onBack: () => void;
  providerManager: ReturnType<typeof useProviderProfiles>;
  embeddingManager: ReturnType<typeof useEmbeddingProfile>;
  askEnabled: boolean;
  onAskEnabledChange: (enabled: boolean) => void;
  appUpdate: ReturnType<typeof useAppUpdate>;
};

export type SettingsSection = Extract<
  AppSection,
  "translation" | "ask" | "language" | "about"
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
  embeddingManager,
  askEnabled,
  onAskEnabledChange,
  appUpdate,
}: Props) {
  const { t } = useTranslation();
  const { showDialog, showError } = useAppDialog();
  const [picker, setPicker] = useState<"ui" | "translation" | null>(null);
  const title = t(
    section === "translation"
      ? "menu.translation"
      : section === "ask"
        ? "menu.ask"
        : section === "language"
          ? "menu.language"
          : "settings.about",
  );
  const uiOptions = useMemo<LanguageOption[]>(() => {
    const resolved = deviceUiLang();
    const resolvedLabel = UI_LANG_OPTIONS.find(
      (option) => option.id === resolved,
    );
    return UI_LANG_OPTIONS.map((option) => ({
      id: option.id,
      label: t(option.labelKey),
      detail:
        option.id === "system" && resolvedLabel
          ? t(resolvedLabel.labelKey)
          : undefined,
    }));
  }, [t]);
  const translateOptions = useMemo<LanguageOption[]>(() => {
    const resolved = deviceTranslateLang();
    const resolvedOption = TRANSLATE_OPTIONS.find(
      (option) => option.id === resolved,
    );
    return TRANSLATE_OPTIONS.map((option) => ({
      id: option.id,
      label: t(option.labelKey),
      detail:
        option.id === "system"
          ? resolvedOption
            ? t(resolvedOption.labelKey)
            : resolved
          : undefined,
      keywords: option.keywords,
    }));
  }, [t]);

  const confirmReset = () => {
    showDialog({
      kind: "destructive",
      title: t("settings.resetTitle"),
      message: t("settings.resetBody"),
      actions: [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.reset"),
          style: "destructive",
          onPress: async () => {
            try {
              await onReset();
              showDialog({
                kind: "success",
                title: t("settings.resetSuccess"),
              });
            } catch (error) {
              showError(t("common.operationFailed"), error);
            }
          },
        },
      ],
    });
  };

  const openRelease = async () => {
    if (!appUpdate.release) return;
    try {
      await Linking.openURL(appUpdate.release.url);
    } catch (error) {
      showError(t("common.operationFailed"), error);
    }
  };

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
              <LanguagePickerField
                value={uiLang}
                options={uiOptions}
                onPress={() => setPicker("ui")}
              />
            </>
          ) : null}

          {section === "translation" ? (
            <>
              <Text style={styles.section}>
                {t("settings.translationLanguage")}
              </Text>
              <Text style={styles.hint}>{t("settings.translationHint")}</Text>
              <LanguagePickerField
                value={translateLang}
                options={translateOptions}
                onPress={() => setPicker("translation")}
              />
              <ProviderSettings manager={providerManager} />
            </>
          ) : null}

          {section === "ask" ? (
            <AskSettings
              enabled={askEnabled}
              onEnabledChange={onAskEnabledChange}
              providerManager={providerManager}
              embeddingManager={embeddingManager}
            />
          ) : null}

          {section === "about" ? (
            <>
              <View style={styles.aboutBox}>
                <View style={styles.aboutHeading}>
                  <Info color={colors.text} size={21} strokeWidth={1.8} />
                  <View>
                    <Text style={styles.aboutTitle}>Paprism</Text>
                    <Text style={styles.aboutBody}>
                      {t("settings.version", {
                        version: appUpdate.currentVersion,
                      })}
                    </Text>
                  </View>
                </View>
                <Text style={styles.aboutBody}>{t("settings.aboutBody1")}</Text>
                <Text style={styles.aboutBody}>{t("settings.aboutBody2")}</Text>
                <View style={styles.updateArea}>
                  <View style={styles.updateCopy}>
                    {appUpdate.status === "checking" ? (
                      <ActivityIndicator color={colors.accent} size="small" />
                    ) : (
                      <View
                        style={[
                          styles.statusDot,
                          appUpdate.status === "available" &&
                            styles.statusDotAvailable,
                          appUpdate.status === "error" && styles.statusDotError,
                        ]}
                      />
                    )}
                    <View style={styles.updateText}>
                      <Text style={styles.updateTitle}>
                        {t(`settings.update.${appUpdate.status}`, {
                          version: appUpdate.release?.version,
                        })}
                      </Text>
                      {appUpdate.status === "available" ? (
                        <Text style={styles.updateHint}>
                          {t("settings.updateAvailableHint")}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {appUpdate.status === "available" ? (
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => void openRelease()}
                      style={styles.updateButton}
                    >
                      <ExternalLink color={colors.inverse} size={15} />
                      <Text style={styles.updateButtonText}>
                        {t("settings.viewUpdate")}
                      </Text>
                    </Pressable>
                  ) : appUpdate.status === "error" ||
                    appUpdate.status === "current" ? (
                    <Pressable
                      onPress={() => void appUpdate.check()}
                      style={styles.retryButton}
                    >
                      <RefreshCw color={colors.textSecondary} size={15} />
                      <Text style={styles.retryText}>
                        {t("settings.checkAgain")}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <Pressable
                onPress={confirmReset}
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
        <LanguagePickerSheet
          visible={picker === "ui"}
          title={t("settings.appLanguage")}
          value={uiLang}
          options={uiOptions}
          onSelect={(value) => onUiLangChange(value as UiLangPref)}
          onClose={() => setPicker(null)}
        />
        <LanguagePickerSheet
          visible={picker === "translation"}
          title={t("settings.translationLanguage")}
          value={translateLang}
          options={translateOptions}
          searchable
          onSelect={onTranslateLangChange}
          onClose={() => setPicker(null)}
        />
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
  updateArea: {
    marginTop: 14,
    paddingTop: 14,
    gap: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  updateCopy: { flexDirection: "row", alignItems: "center", gap: 10 },
  updateText: { flex: 1 },
  updateTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: "700" },
  updateHint: { color: colors.dim, fontSize: 12, lineHeight: 17, marginTop: 3 },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#34d399",
  },
  statusDotAvailable: { backgroundColor: colors.danger },
  statusDotError: { backgroundColor: colors.dim },
  updateButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: radii.medium,
    backgroundColor: colors.text,
  },
  updateButtonText: { color: colors.inverse, fontWeight: "700" },
  retryButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: radii.medium,
    backgroundColor: colors.surfaceRaised,
  },
  retryText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
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
