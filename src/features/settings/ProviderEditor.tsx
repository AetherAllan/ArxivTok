import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Trash2 from "lucide-react-native/icons/trash-2";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii } from "@/shared/theme";
import {
  searchModels,
  type ModelOption,
  type ProviderProfile,
} from "./providerCore";
import { fetchModelCatalog } from "./providers";
import type { useProviderProfiles } from "./useProviderProfiles";

type Manager = ReturnType<typeof useProviderProfiles>;

export function ProviderEditor({
  draft,
  manager,
  onClose,
}: {
  draft: ProviderProfile | null;
  manager: Manager;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<ProviderProfile | null>(draft);
  const [apiKey, setApiKey] = useState("");
  const [query, setQuery] = useState("");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(false);

  if (!draft || !form) return null;

  const visibleModels = useMemo(
    () => searchModels(models, query).slice(0, 50),
    [models, query],
  );

  const loadModels = async () => {
    setLoading(true);
    try {
      const key = apiKey.trim() || (await manager.getApiKey(form.id));
      const next = await fetchModelCatalog(form, key, true);
      setModels(next);
      Alert.alert(
        t("provider.connectionOk"),
        t("provider.modelsFound", { count: next.length }),
      );
    } catch (error) {
      Alert.alert(
        t("provider.connectionFailed"),
        error instanceof Error ? error.message : t("common.unknownError"),
      );
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      const existingKey = apiKey.trim() || (await manager.getApiKey(form.id));
      if (!existingKey) throw new Error(t("provider.keyRequired"));
      await manager.saveProfile(form, apiKey);
      onClose();
    } catch (error) {
      Alert.alert(
        t("provider.saveFailed"),
        error instanceof Error ? error.message : t("common.unknownError"),
      );
    }
  };

  const remove = () => {
    Alert.alert(t("provider.deleteTitle"), form.name, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("library.clear"),
        style: "destructive",
        onPress: () => void manager.deleteProfile(form.id).then(onClose),
      },
    ]);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.editor, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.secondaryAction}>{t("common.cancel")}</Text>
          </Pressable>
          <Text style={styles.title}>{t("provider.editTitle")}</Text>
          <Pressable onPress={() => void save()} hitSlop={10}>
            <Text style={styles.save}>{t("common.done")}</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <Field
            label={t("provider.name")}
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
          />
          <Field label={t("provider.kind")} value={form.kind} editable={false} />
          <Field
            label={t("provider.endpoint")}
            value={form.baseUrl}
            editable={form.kind === "openai-compatible"}
            autoCapitalize="none"
            onChangeText={(baseUrl) => setForm({ ...form, baseUrl })}
          />
          <Field
            label={t("provider.apiKey")}
            value={apiKey}
            placeholder={t("provider.keyPlaceholder")}
            secureTextEntry
            autoCapitalize="none"
            onChangeText={setApiKey}
          />
          <Field
            label={t("provider.model")}
            value={form.model}
            autoCapitalize="none"
            onChangeText={(model) => setForm({ ...form, model })}
          />
          <Pressable
            style={styles.testButton}
            onPress={() => void loadModels()}
            disabled={loading}
          >
            <Text style={styles.testText}>
              {loading ? t("provider.loadingModels") : t("provider.testAndLoad")}
            </Text>
          </Pressable>
          {models.length > 0 ? (
            <>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t("provider.searchModels")}
                placeholderTextColor={colors.dim}
                style={styles.input}
              />
              {visibleModels.map((model, index) => (
                <Pressable
                  key={model.id}
                  style={styles.modelRow}
                  onPress={() => setForm({ ...form, model: model.id })}
                >
                  <View style={styles.modelMain}>
                    <Text style={styles.modelName} numberOfLines={1}>
                      {model.name}
                    </Text>
                    <Text style={styles.modelId} numberOfLines={1}>
                      {model.id}
                    </Text>
                  </View>
                  {model.free && index < 5 ? (
                    <Text style={styles.free}>FREE</Text>
                  ) : null}
                </Pressable>
              ))}
            </>
          ) : null}
          {manager.profiles.some((profile) => profile.id === form.id) ? (
            <Pressable style={styles.deleteButton} onPress={remove}>
              <Trash2 color={colors.danger} size={17} strokeWidth={1.8} />
              <Text style={styles.deleteText}>{t("provider.delete")}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Field(
  props: React.ComponentProps<typeof TextInput> & { label: string },
) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.dim}
        style={[styles.input, inputProps.editable === false && styles.disabled]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "700" },
  secondaryAction: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  save: { color: colors.text, fontSize: 15, fontWeight: "700" },
  body: { padding: 16, paddingBottom: 48 },
  field: { marginBottom: 14 },
  label: { color: colors.muted, fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.medium,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  disabled: { color: colors.dim },
  testButton: {
    backgroundColor: colors.text,
    borderRadius: radii.medium,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 14,
  },
  testText: { color: colors.inverse, fontWeight: "700" },
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modelMain: { flex: 1 },
  modelName: { color: colors.text, fontSize: 14, fontWeight: "600" },
  modelId: { color: colors.dim, fontSize: 12, marginTop: 3 },
  free: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 8,
  },
  deleteButton: {
    marginTop: 28,
    minHeight: 44,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  deleteText: { color: colors.danger, fontWeight: "600" },
});
