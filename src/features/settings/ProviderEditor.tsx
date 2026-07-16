import { useEffect, useState } from "react";
import {
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
import { type ModelOption, type ProviderProfile } from "./providerCore";
import { fetchModelCatalog } from "./providers";
import { ModelPicker } from "./ModelPicker";
import { SecretField } from "./SecretField";
import { useAppDialog } from "@/shared/AppDialog";

export type EditableProviderManager = {
  profiles: ProviderProfile[];
  activeProfileId: string | null;
  saveProfile: (profile: ProviderProfile, apiKey?: string) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  setActiveProfileId: (profileId: string) => Promise<void>;
  getApiKey: (profileId: string) => Promise<string | null>;
};

export type ModelLoader = (
  profile: ProviderProfile,
  apiKey: string,
) => Promise<ModelOption[]>;

const loadProviderModels: ModelLoader = (profile, apiKey) =>
  fetchModelCatalog(profile, apiKey, true);

export function ProviderEditor({
  draft,
  manager,
  modelLoader = loadProviderModels,
  onClose,
}: {
  draft: ProviderProfile | null;
  manager: EditableProviderManager;
  modelLoader?: ModelLoader;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { showDialog, showError } = useAppDialog();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<ProviderProfile | null>(draft);
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const isExisting = draft
    ? manager.profiles.some((profile) => profile.id === draft.id)
    : false;
  const getApiKey = manager.getApiKey;

  useEffect(() => {
    if (!draft || !isExisting) {
      setHasSavedKey(false);
      return;
    }

    let cancelled = false;
    void getApiKey(draft.id).then(
      (key) => {
        // Only the existence bit enters React state. The secret itself remains
        // owned by SecureStore and is never copied into the editable field.
        if (!cancelled) setHasSavedKey(Boolean(key));
      },
      () => {
        if (!cancelled) setHasSavedKey(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [draft, getApiKey, isExisting]);

  if (!draft || !form) return null;

  const loadModels = async () => {
    setLoading(true);
    try {
      const key = apiKey.trim() || (await manager.getApiKey(form.id));
      if (!key) throw new Error(t("provider.keyRequired"));
      const next = await modelLoader(form, key);
      setModels(next);
      showDialog({
        kind: "success",
        title: t("provider.connectionOk"),
        message: t("provider.modelsFound", { count: next.length }),
      });
    } catch (error) {
      showError(t("provider.connectionFailed"), error);
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
      showDialog({ kind: "success", title: t("provider.saved") });
    } catch (error) {
      showError(t("provider.saveFailed"), error);
    }
  };

  const remove = () => {
    showDialog({
      kind: "destructive",
      title: t("provider.deleteTitle"),
      message: form.name,
      actions: [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("library.clear"),
          style: "destructive",
          onPress: async () => {
            try {
              await manager.deleteProfile(form.id);
              onClose();
              showDialog({
                kind: "success",
                title: t("provider.deleted"),
              });
            } catch (error) {
              showError(t("common.operationFailed"), error);
            }
          },
        },
      ],
    });
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
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
          <Field
            label={t("provider.kind")}
            value={form.kind}
            editable={false}
          />
          <Field
            label={t("provider.endpoint")}
            value={form.baseUrl}
            editable={form.kind === "openai-compatible"}
            autoCapitalize="none"
            onChangeText={(baseUrl) => setForm({ ...form, baseUrl })}
          />
          <SecretField
            label={t("provider.apiKey")}
            value={apiKey}
            hasSavedKey={hasSavedKey}
            placeholder={t("provider.keyPlaceholder")}
            clearLabel={t("provider.clearKey")}
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
              {loading
                ? t("provider.loadingModels")
                : t("provider.testAndLoad")}
            </Text>
          </Pressable>
          <ModelPicker
            models={models}
            selectedId={form.model}
            onSelect={(model) => setForm({ ...form, model })}
          />
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
