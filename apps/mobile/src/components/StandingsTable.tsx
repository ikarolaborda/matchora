/**
 * StandingsTable — a single group's table. Qualification state shown via a
 * left color bar + a11y label (never color alone). Columns: P W D L GD Pts.
 */
import { StyleSheet, Text, View } from 'react-native';
import type { GroupStanding, QualificationState } from '@matchora/shared';
import { qualificationColor } from '@matchora/ui';
import { colors, fontSize, radius, space, weight } from '@/src/lib/theme';
import { teamDisplay } from '@/src/lib/teamDisplay';
import { TeamBadge } from './TeamBadge';

const QUAL_LABEL: Record<QualificationState, string> = {
  qualified: 'Qualified',
  provisionally_qualified: 'Provisionally qualified',
  still_possible: 'Still possible',
  eliminated: 'Eliminated',
  unknown: 'Undetermined',
};

interface Props {
  standing: GroupStanding;
  title: string;
}

export function StandingsTable({ standing, title }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {standing.provisional ? <Text style={styles.provisional}>provisional</Text> : null}
      </View>

      <View style={[styles.row, styles.headRow]}>
        <Text style={[styles.cellTeam, styles.headText]}>Team</Text>
        <Text style={[styles.cell, styles.headText]}>P</Text>
        <Text style={[styles.cell, styles.headText]}>W</Text>
        <Text style={[styles.cell, styles.headText]}>D</Text>
        <Text style={[styles.cell, styles.headText]}>L</Text>
        <Text style={[styles.cell, styles.headText]}>GD</Text>
        <Text style={[styles.cell, styles.headText]}>Pts</Text>
      </View>

      {standing.rows.map((r) => {
        const color = qualificationColor[r.qualification] ?? colors.textFaint;
        const { code } = teamDisplay(r.teamId);
        return (
          <View
            key={r.teamId}
            style={styles.row}
            accessibilityLabel={`${code}, ${QUAL_LABEL[r.qualification]}, ${r.points} points`}
          >
            <View style={[styles.qualBar, { backgroundColor: color }]} />
            <View style={styles.cellTeam}>
              <TeamBadge teamId={r.teamId} />
            </View>
            <Text style={styles.cell}>{r.played}</Text>
            <Text style={styles.cell}>{r.won}</Text>
            <Text style={styles.cell}>{r.drawn}</Text>
            <Text style={styles.cell}>{r.lost}</Text>
            <Text style={styles.cell}>{r.goalDifference}</Text>
            <Text style={[styles.cell, styles.pts]}>{r.points}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  title: { color: colors.text, fontSize: fontSize.title, fontWeight: weight.title },
  provisional: { color: colors.warn, fontSize: fontSize.caption, fontWeight: weight.title },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.sm,
    paddingRight: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  headRow: { borderTopWidth: 0, marginTop: space.sm },
  headText: { color: colors.textFaint, fontWeight: weight.title, fontSize: fontSize.caption },
  qualBar: { width: 4, alignSelf: 'stretch', marginRight: space.sm },
  cellTeam: { flex: 1, paddingLeft: space.xs },
  cell: {
    width: 30,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.body,
    fontVariant: ['tabular-nums'],
  },
  pts: { color: colors.text, fontWeight: weight.title },
});
