import { View, type ViewStyle } from 'react-native';

// Small native line icons avoid font downloads or another graphics dependency.
export default function TabIcon({
  name,
  color,
}: {
  name: 'index' | 'tournaments' | 'players' | 'settings';
  color: string;
}) {
  const line = (style: ViewStyle, key: string) => (
    <View
      key={key}
      style={[{ position: 'absolute', borderColor: color, borderWidth: 1.6 }, style]}
    />
  );
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ width: 24, height: 24 }}
    >
      {name === 'index' ? (
        <>
          {line(
            {
              width: 14,
              height: 14,
              left: 5,
              top: 4,
              transform: [{ rotate: '45deg' }],
              borderBottomWidth: 0,
              borderRightWidth: 0,
              borderTopLeftRadius: 2,
            },
            'roof',
          )}
          {line(
            {
              width: 14,
              height: 12,
              left: 5,
              top: 10,
              borderTopWidth: 0,
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2,
            },
            'base',
          )}
          {line({ height: 7, width: 4, left: 10, top: 15, borderBottomWidth: 0 }, 'door')}
        </>
      ) : null}
      {name === 'tournaments' ? (
        <>
          {line(
            {
              width: 13,
              height: 13,
              left: 5.5,
              top: 2,
              borderBottomLeftRadius: 7,
              borderBottomRightRadius: 7,
            },
            'cup',
          )}
          {line(
            {
              width: 4,
              height: 7,
              left: 2,
              top: 4,
              borderRightWidth: 0,
              borderBottomLeftRadius: 5,
            },
            'left',
          )}
          {line(
            {
              width: 4,
              height: 7,
              right: 2,
              top: 4,
              borderLeftWidth: 0,
              borderBottomRightRadius: 5,
            },
            'right',
          )}
          {line({ width: 0, height: 5, left: 12, top: 15 }, 'stem')}
          {line({ width: 12, height: 0, left: 6, top: 21 }, 'foot')}
        </>
      ) : null}
      {name === 'players' ? (
        <>
          {line({ width: 8, height: 8, left: 3, top: 2, borderRadius: 4 }, 'head1')}
          {line({ width: 7, height: 7, right: 2, top: 4, borderRadius: 4 }, 'head2')}
          {line(
            {
              width: 13,
              height: 10,
              left: 0,
              top: 13,
              borderTopLeftRadius: 7,
              borderTopRightRadius: 7,
              borderBottomWidth: 0,
            },
            'body1',
          )}
          {line(
            {
              width: 10,
              height: 9,
              right: 0,
              top: 14,
              borderTopLeftRadius: 7,
              borderTopRightRadius: 7,
              borderBottomWidth: 0,
            },
            'body2',
          )}
        </>
      ) : null}
      {name === 'settings'
        ? [5, 12, 19].map((top, index) => (
            <View key={top}>
              {line({ top, width: 22, height: 0 }, 'track')}
              {line(
                {
                  top: top - 3,
                  left: index === 1 ? 14 : 5,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#101E18',
                },
                'knob',
              )}
            </View>
          ))
        : null}
    </View>
  );
}
