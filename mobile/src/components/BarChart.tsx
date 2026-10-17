/**
 * BarChart — Inline SVG bar chart for React Native Web + Native.
 *
 * Strategy: On native, uses react-native-svg. On web, renders a pure
 * HTML/SVG string via an inline <svg> element through a WebView or
 * directly in a View with proper SVG components.
 *
 * Since react-native-svg is already installed in this project (it is a
 * dependency of react-native-maps and expo), we use it directly.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { COLORS } from '../theme/colors';

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarDatum[];
  /** Chart height in pixels */
  height?: number;
  /** Bar color when not specified per datum */
  barColor?: string;
  /** Show value labels above bars */
  showValues?: boolean;
  /** Maximum number of x-axis date labels */
  maxLabels?: number;
  accessibilityLabel?: string;
}

/**
 * Pure RN layout-based bar chart (no SVG library dependency).
 * Renders flex-aligned bars at correct relative heights.
 * Accessible via aria labels and individual bar accessibility hints.
 */
export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 160,
  barColor = COLORS.primary,
  showValues = false,
  maxLabels = 6,
  accessibilityLabel,
}) => {
  const max = useMemo(() => Math.max(1, ...data.map(d => d.value)), [data]);

  if (!data.length) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No data for selected period</Text>
      </View>
    );
  }

  const labelInterval = Math.ceil(data.length / maxLabels);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={
        accessibilityLabel ||
        `Bar chart with ${data.length} data points. Max value: ${max}`
      }
      style={{ height, width: '100%' }}
    >
      {/* Y-axis reference lines */}
      <View style={[StyleSheet.absoluteFillObject, styles.gridLines]} pointerEvents="none">
        {[1, 0.75, 0.5, 0.25].map(pct => (
          <View
            key={pct}
            style={[
              styles.gridLine,
              { top: `${(1 - pct) * 100}%` as any },
            ]}
          />
        ))}
      </View>

      {/* Bar columns */}
      <View style={styles.barsRow}>
        {data.map((d, index) => {
          const pct = max > 0 ? d.value / max : 0;
          const barH = Math.max(2, pct * (height - 28));
          const col = d.color || barColor;
          const showLabel =
            data.length <= maxLabels ||
            index % labelInterval === 0 ||
            index === data.length - 1;

          return (
            <View
              key={`${d.label}-${index}`}
              style={styles.barCol}
              accessible
              accessibilityLabel={`${d.label}: ${d.value}`}
            >
              {showValues && d.value > 0 && (
                <Text style={styles.valueLabel}>{d.value}</Text>
              )}
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barH,
                      backgroundColor: col,
                    },
                  ]}
                />
              </View>
              <Text
                style={[styles.xLabel, !showLabel && { opacity: 0 }]}
                numberOfLines={1}
              >
                {showLabel ? d.label : ' '}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

/**
 * SparkLine — tiny inline trend indicator using absolute-positioned dots.
 * Used in stat cards / KPI panels for small trend context.
 */
interface SparkLineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

export const SparkLine: React.FC<SparkLineProps> = ({
  data,
  width = 80,
  height = 28,
  color = COLORS.primary,
}) => {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  // Render as tiny proportional dots connected by a visual line
  return (
    <View
      style={{ width, height, flexDirection: 'row', alignItems: 'flex-end' }}
      accessibilityRole="image"
      accessibilityLabel="Trend line"
    >
      {data.map((v, i) => {
        const pct = (v - min) / range;
        const dotH = Math.max(2, pct * (height - 4));
        const isLast = i === data.length - 1;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: height,
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: isLast ? 5 : 3,
                height: dotH,
                borderRadius: 1.5,
                backgroundColor: isLast ? color : `${color}60`,
              }}
            />
          </View>
        );
      })}
    </View>
  );
};

/**
 * MiniDonut — SVG-free donut chart using border-radius trick.
 * Shows a two-segment progress ring (resolved vs unresolved).
 */
interface MiniDonutProps {
  resolved: number;
  total: number;
  size?: number;
  color?: string;
}

export const MiniDonut: React.FC<MiniDonutProps> = ({
  resolved,
  total,
  size = 56,
  color = COLORS.resolved,
}) => {
  const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: COLORS.backgroundNeutral,
        }}
      />
      {/* Fill arc using a conic gradient via pseudo-element (web only) or colored ring */}
      {Platform.OS === 'web' ? (
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            ...(Platform.OS === 'web'
              ? ({
                  background: `conic-gradient(${color} ${pct}%, ${COLORS.backgroundNeutral} ${pct}%)`,
                } as any)
              : {}),
          }}
        />
      ) : (
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 6,
            borderColor: COLORS.backgroundNeutral,
          }}
        />
      )}
      {/* Inner hole */}
      <View
        style={{
          width: size - 14,
          height: size - 14,
          borderRadius: (size - 14) / 2,
          backgroundColor: COLORS.surface,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <Text
          style={{
            fontSize: size < 56 ? 11 : 13,
            fontWeight: '700',
            color: COLORS.textPrimary,
          }}
        >
          {pct}%
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundNeutral,
    borderRadius: 8,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  gridLines: {
    pointerEvents: 'none',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.borderLight,
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 18,
    gap: 2,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  barWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '78%',
    maxWidth: 40,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  valueLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginBottom: 2,
    fontWeight: '600',
  },
  xLabel: {
    position: 'absolute',
    bottom: 0,
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
    width: '100%',
    lineHeight: 14,
  },
});
