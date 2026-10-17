import { Platform, Dimensions } from 'react-native';
import { COLORS } from './colors';
import { TYPOGRAPHY, IS_TABLET, IS_SMALL_PHONE } from './typography';
import { SPACING } from './spacing';
import { BORDER_RADIUS } from './radius';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export const SHADOWS = {
  sm: Platform.select({
    web: { boxShadow: '0 1px 2px 0 rgba(24, 24, 27, 0.05)' },
    default: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    }
  }),
  card: Platform.select({
    web: { boxShadow: '0 2px 8px -1px rgba(24, 24, 27, 0.08), 0 1px 3px -1px rgba(24, 24, 27, 0.04)' },
    default: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    }
  }),
  cardHover: Platform.select({
    web: { boxShadow: '0 10px 20px -3px rgba(24, 24, 27, 0.10), 0 4px 6px -2px rgba(24, 24, 27, 0.05)' },
    default: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.10,
      shadowRadius: 16,
      elevation: 4,
    }
  }),
  elevated: Platform.select({
    web: { boxShadow: '0 4px 12px -2px rgba(24, 24, 27, 0.08), 0 2px 6px -1px rgba(24, 24, 27, 0.04)' },
    default: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }
  }),
  button: Platform.select({
    web: { boxShadow: '0 4px 14px 0 rgba(190, 38, 56, 0.14)' },
    default: {
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.22,
      shadowRadius: 8,
      elevation: 3,
    }
  }),
  buttonAccent: Platform.select({
    web: { boxShadow: '0 4px 14px 0 rgba(152, 97, 11, 0.14)' },
    default: {
      shadowColor: COLORS.secondary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 3,
    }
  }),
  floating: Platform.select({
    web: { boxShadow: '0 20px 25px -5px rgba(24, 24, 27, 0.10), 0 10px 10px -5px rgba(24, 24, 27, 0.04)' },
    default: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.14,
      shadowRadius: 24,
      elevation: 8,
    }
  }),
};

export const LAYOUT = {
  windowWidth: SCREEN_WIDTH,
  windowHeight: SCREEN_HEIGHT,
  isTablet: IS_TABLET,
  isSmallPhone: IS_SMALL_PHONE,
  maxContentWidth: 1520,
  maxFormWidth: 460,
  touchTargetMin: 48,
};

export { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, IS_TABLET, IS_SMALL_PHONE };
