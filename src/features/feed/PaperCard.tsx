import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Bookmark from "lucide-react-native/icons/bookmark";
import BookmarkCheck from "lucide-react-native/icons/bookmark-check";
import BookOpen from "lucide-react-native/icons/book-open";
import Download from "lucide-react-native/icons/download";
import FileCheck from "lucide-react-native/icons/file-check";
import X from "lucide-react-native/icons/x";
import { colors, radii } from "@/shared/theme";
import type { Paper } from "@/types/paper";

type Props = {
  paper: Paper;
  height: number;
  saved: boolean;
  downloading: boolean;
  canCancelDownload: boolean;
  hasOfflineHtml: boolean;
  hasPdf: boolean;
  onRead: (paper: Paper) => void;
  onToggleSave: (paper: Paper) => void;
  onDownload: (paper: Paper) => void;
  onCancelDownload: () => void;
};

export function PaperCard({
  paper,
  height,
  saved,
  downloading,
  canCancelDownload,
  hasOfflineHtml,
  hasPdf,
  onRead,
  onToggleSave,
  onDownload,
  onCancelDownload,
}: Props) {
  const { t, i18n } = useTranslation();
  const authorLine =
    paper.authors.length <= 3
      ? paper.authors.join(", ")
      : `${paper.authors.slice(0, 3).join(", ")} +${paper.authors.length - 3}`;

  const date = paper.published
    ? new Date(paper.published).toLocaleDateString(
        i18n.language === "zh" ? "zh-CN" : "en",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        },
      )
    : "";

  return (
    <View style={[styles.shell, { height }]}>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        bounces
        nestedScrollEnabled
      >
        {date ? <Text style={styles.date}>{date}</Text> : null}

        <Text style={styles.cats} numberOfLines={2}>
          {paper.categories.slice(0, 4).join(" · ")}
        </Text>

        <Text style={styles.title}>{paper.title}</Text>
        <Text style={styles.authors}>{authorLine}</Text>
        <Text style={styles.arxivId}>{paper.arxivId}</Text>

        <Text style={styles.sectionLabel}>{t("common.abstract")}</Text>
        <Text style={styles.abstract}>{paper.abstract}</Text>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.readBtn,
            pressed && styles.pressed,
          ]}
          onPress={() => onRead(paper)}
        >
          <BookOpen color={colors.inverse} size={18} strokeWidth={2} />
          <Text style={styles.readBtnText}>{t("common.read")}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.secondaryBtn,
            saved && styles.secondaryBtnOn,
            pressed && styles.pressed,
          ]}
          onPress={() => onToggleSave(paper)}
        >
          {saved ? (
            <BookmarkCheck color={colors.text} size={17} strokeWidth={1.8} />
          ) : (
            <Bookmark color={colors.textSecondary} size={17} strokeWidth={1.8} />
          )}
          <Text
            style={[styles.secondaryText, saved && styles.secondaryTextOn]}
          >
            {saved ? t("common.saved") : t("common.save")}
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && styles.pressed,
          ]}
          disabled={downloading && !canCancelDownload}
          onPress={() =>
            downloading && canCancelDownload
              ? onCancelDownload()
              : onDownload(paper)
          }
        >
          {downloading && canCancelDownload ? (
            <X color={colors.textSecondary} size={17} strokeWidth={1.8} />
          ) : hasOfflineHtml || hasPdf ? (
            <FileCheck color={colors.textSecondary} size={17} strokeWidth={1.8} />
          ) : (
            <Download color={colors.textSecondary} size={17} strokeWidth={1.8} />
          )}
          <Text style={styles.secondaryText}>
            {downloading
              ? canCancelDownload
                ? t("common.cancel")
                : t("common.downloading")
              : hasOfflineHtml
                ? t("common.offlineRead")
                : hasPdf
                  ? t("common.pdfSaved")
                : t("common.download")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 12,
  },
  date: {
    color: colors.dim,
    fontSize: 12,
    marginBottom: 8,
  },
  cats: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 30,
    marginBottom: 10,
  },
  authors: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  arxivId: {
    color: colors.dim,
    fontSize: 12,
    marginBottom: 18,
    fontVariant: ["tabular-nums"],
  },
  sectionLabel: {
    color: colors.dim,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  abstract: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 25,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  readBtn: {
    flex: 1.2,
    minHeight: 48,
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
    backgroundColor: colors.text,
    borderRadius: radii.medium,
    paddingVertical: 14,
    alignItems: "center",
  },
  readBtnText: {
    color: colors.inverse,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    borderRadius: radii.medium,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  secondaryBtnOn: {
    backgroundColor: colors.surfacePressed,
  },
  secondaryText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  secondaryTextOn: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.85,
  },
});
