import { Pressable, StyleSheet, Text, View } from "react-native";
import Bookmark from "lucide-react-native/icons/bookmark";
import BookmarkCheck from "lucide-react-native/icons/bookmark-check";
import Download from "lucide-react-native/icons/download";
import { useTranslation } from "react-i18next";
import { colors, radii } from "@/shared/theme";
import type { Paper } from "@/types/paper";

type Props = {
  paper: Paper;
  saved: boolean;
  downloaded: boolean;
  onRead: (paper: Paper) => void;
  onToggleSave: (paper: Paper) => void;
  onDownload: (paper: Paper) => void;
};

export function SearchResultRow({
  paper,
  saved,
  downloaded,
  onRead,
  onToggleSave,
  onDownload,
}: Props) {
  const { t } = useTranslation();

  return (
    <Pressable onPress={() => onRead(paper)} style={styles.result}>
      <Text style={styles.title}>{paper.title}</Text>
      <Text style={styles.authors} numberOfLines={1}>
        {paper.authors.slice(0, 3).join(", ")}
      </Text>
      <Text style={styles.abstract} numberOfLines={3}>
        {paper.abstract}
      </Text>
      <View style={styles.actions}>
        <Text style={styles.read}>{t("common.read")}</Text>
        <Pressable
          accessibilityLabel={t(saved ? "common.saved" : "common.save")}
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation?.();
            onToggleSave(paper);
          }}
          style={styles.actionButton}
        >
          {saved ? (
            <BookmarkCheck color={colors.text} size={18} strokeWidth={1.8} />
          ) : (
            <Bookmark color={colors.muted} size={18} strokeWidth={1.8} />
          )}
        </Pressable>
        <Pressable
          accessibilityLabel={t(
            downloaded ? "common.downloaded" : "common.download",
          )}
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation?.();
            onDownload(paper);
          }}
          style={styles.actionButton}
        >
          <Download
            color={downloaded ? colors.text : colors.muted}
            size={18}
            strokeWidth={1.8}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  result: {
    padding: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.medium,
    gap: 5,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "700",
  },
  authors: { color: colors.muted, fontSize: 13 },
  abstract: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 6,
  },
  actionButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  read: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "600" },
});
