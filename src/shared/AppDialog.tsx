import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import CircleCheck from "lucide-react-native/icons/circle-check";
import CircleX from "lucide-react-native/icons/circle-x";
import Info from "lucide-react-native/icons/info";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import { useTranslation } from "react-i18next";
import Animated, {
  FadeIn,
  ZoomIn,
  useReducedMotion,
} from "react-native-reanimated";
import { colors, radii } from "./theme";

export type DialogKind = "info" | "success" | "error" | "destructive";
export type DialogActionStyle = "default" | "cancel" | "destructive";

export type DialogAction = {
  text: string;
  style?: DialogActionStyle;
  onPress?: () => void | Promise<void>;
};

export type DialogOptions = {
  title: string;
  message?: string;
  kind?: DialogKind;
  actions?: DialogAction[];
};

type DialogContextValue = {
  showDialog: (options: DialogOptions) => void;
  showError: (title: string, error: unknown) => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const dismissDialog = useCallback(() => setDialog(null), []);
  const showDialog = useCallback((options: DialogOptions) => {
    setDialog(options);
  }, []);
  const showError = useCallback(
    (title: string, error: unknown) =>
      setDialog({
        kind: "error",
        title,
        message:
          error instanceof Error ? error.message : t("common.unknownError"),
      }),
    [t],
  );
  const value = useMemo(
    () => ({ showDialog, showError }),
    [showDialog, showError],
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      <DialogHost dialog={dialog} onDismiss={dismissDialog} />
    </DialogContext.Provider>
  );
}

export function useAppDialog(): DialogContextValue {
  const value = useContext(DialogContext);
  if (!value)
    throw new Error("useAppDialog must be used inside AppDialogProvider");
  return value;
}

function DialogHost({
  dialog,
  onDismiss,
}: {
  dialog: DialogOptions | null;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  if (!dialog) return null;

  const kind = dialog.kind ?? "info";
  const actions = dialog.actions?.length
    ? dialog.actions.slice(0, 3)
    : [{ text: t("common.done") }];
  const dismissible = kind !== "destructive";
  const Icon =
    kind === "success"
      ? CircleCheck
      : kind === "error"
        ? CircleX
        : kind === "destructive"
          ? TriangleAlert
          : Info;
  const iconColor =
    kind === "success"
      ? "#34d399"
      : kind === "error" || kind === "destructive"
        ? colors.danger
        : colors.accent;

  const selectAction = (action: DialogAction) => {
    onDismiss();
    void action.onPress?.();
  };

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (dismissible) onDismiss();
      }}
    >
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(160)}
        style={styles.backdrop}
      >
        <Pressable
          accessibilityLabel={t("common.close")}
          disabled={!dismissible}
          onPress={onDismiss}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          accessibilityViewIsModal
          importantForAccessibility="yes"
          entering={reduceMotion ? undefined : ZoomIn.duration(180)}
          style={styles.card}
        >
          <View style={[styles.icon, { backgroundColor: `${iconColor}18` }]}>
            <Icon color={iconColor} size={24} strokeWidth={1.9} />
          </View>
          <Text style={styles.title}>{dialog.title}</Text>
          {dialog.message ? (
            <Text selectable style={styles.message}>
              {dialog.message}
            </Text>
          ) : null}
          <View
            style={[
              styles.actions,
              actions.length === 2 && styles.actionsHorizontal,
            ]}
          >
            {actions.map((action, index) => {
              const actionStyle = action.style ?? "default";
              return (
                <Pressable
                  accessibilityRole="button"
                  key={`${action.text}-${index}`}
                  onPress={() => selectAction(action)}
                  style={({ pressed }) => [
                    styles.action,
                    actions.length === 2 && styles.actionHorizontal,
                    actionStyle === "default" && styles.actionPrimary,
                    actionStyle === "destructive" && styles.actionDestructive,
                    pressed && styles.actionPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.actionText,
                      actionStyle === "default" && styles.actionPrimaryText,
                      actionStyle === "destructive" && styles.destructiveText,
                    ]}
                  >
                    {action.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.74)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#18181b",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  icon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    marginBottom: 16,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  message: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
  },
  actions: { gap: 9, marginTop: 22 },
  actionsHorizontal: { flexDirection: "row" },
  action: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: radii.medium,
    backgroundColor: colors.surfacePressed,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  actionHorizontal: { flex: 1 },
  actionPrimary: { backgroundColor: colors.text, borderColor: colors.text },
  actionDestructive: {
    backgroundColor: "rgba(248,113,113,0.12)",
    borderColor: "rgba(248,113,113,0.38)",
  },
  actionPressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  actionText: { color: colors.textSecondary, fontSize: 14, fontWeight: "700" },
  actionPrimaryText: { color: colors.inverse },
  destructiveText: { color: colors.danger },
});
