import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ProviderSettings } from "@/features/settings/ProviderSettings";
import type { useProviderProfiles } from "@/features/settings/useProviderProfiles";
import { colors, radii } from "@/shared/theme";
import { clearAllAskData } from "./askDatabase";
import { fetchEmbeddingModels } from "./embeddingProviders";
import type { useEmbeddingProfile } from "./useEmbeddingProfile";
import { useAppDialog } from "@/shared/AppDialog";

type Props = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  providerManager: ReturnType<typeof useProviderProfiles>;
  embeddingManager: ReturnType<typeof useEmbeddingProfile>;
};

export function AskSettings({
  enabled,
  onEnabledChange,
  providerManager,
  embeddingManager,
}: Props) {
  const { t } = useTranslation();
  const { showDialog, showError } = useAppDialog();

  return (
    <View>
      <View style={styles.toggleRow}>
        <View style={styles.toggleCopy}>
          <Text style={styles.title}>{t("ask.enabled")}</Text>
          <Text style={styles.hint}>{t("ask.enabledHint")}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onEnabledChange}
          thumbColor={enabled ? colors.text : colors.muted}
          trackColor={{
            true: colors.surfacePressed,
            false: colors.surfaceRaised,
          }}
          ios_backgroundColor={colors.surfaceRaised}
        />
      </View>

      <ProviderSettings
        manager={providerManager}
        activeProfileId={providerManager.activeAskProfileId}
        onSelect={providerManager.setActiveAskProfileId}
        includeGoogle={false}
        title={t("ask.chatProvider")}
        hint={t("ask.chatProviderHint")}
      />

      <ProviderSettings
        manager={embeddingManager}
        includeGoogle={false}
        title={t("ask.embeddingProvider")}
        hint={t("ask.embeddingHint")}
        modelLoader={fetchEmbeddingModels}
      />

      <Text style={styles.privacy}>{t("ask.privacy")}</Text>
      <Pressable
        style={styles.destructiveButton}
        onPress={() =>
          showDialog({
            kind: "destructive",
            title: t("ask.clearAllTitle"),
            message: t("ask.clearAllBody"),
            actions: [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("library.clear"),
                style: "destructive",
                onPress: async () => {
                  try {
                    await clearAllAskData();
                    showDialog({
                      kind: "success",
                      title: t("ask.clearAllSuccess"),
                    });
                  } catch (error) {
                    showError(t("common.operationFailed"), error);
                  }
                },
              },
            ],
          })
        }
      >
        <Text style={styles.destructiveText}>{t("ask.clearAll")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 4,
  },
  toggleCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 14, fontWeight: "700" },
  hint: { color: colors.dim, fontSize: 12, lineHeight: 18, marginTop: 4 },
  privacy: { color: colors.dim, fontSize: 12, lineHeight: 18, marginTop: 24 },
  destructiveButton: {
    minHeight: 48,
    marginTop: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.medium,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.danger,
    backgroundColor: "rgba(248,113,113,0.12)",
  },
  destructiveText: {
    color: colors.danger,
    textAlign: "center",
    fontWeight: "700",
  },
});
