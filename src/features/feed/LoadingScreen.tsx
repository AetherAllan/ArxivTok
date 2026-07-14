import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme";

export function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.muted} size="large" />
      <Text style={styles.hint}>{t("common.loadingPapers")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  hint: {
    color: colors.muted,
    fontSize: 15,
  },
});
