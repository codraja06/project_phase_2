import React, { useState } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
export const AdaptiveGrid = ({ children, minWidth = 280, maxColumns = 3, gap = 16, style }: {
  children: React.ReactNode; minWidth?: number; maxColumns?: number; gap?: number; style?: StyleProp<ViewStyle>;
}) => {
  const [width, setWidth] = useState(0);
  const columns = Math.max(1, Math.min(maxColumns, Math.floor((width + gap) / (minWidth + gap))));
  const items = React.Children.toArray(children).filter(React.isValidElement);
  return <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={[{ flexDirection: 'row', flexWrap: 'wrap', gap, minWidth: 0 }, style]}>
    {items.map((item, index) => <View key={index} style={{ width: width ? (width - gap * (columns - 1)) / columns : '100%', minWidth: 0 }}>{item}</View>)}
  </View>;
};
