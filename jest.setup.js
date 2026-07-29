import '@testing-library/jest-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(undefined),
  multiRemove: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-font', () => ({
  useFonts: () => [true, null, () => {}],
  loadAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Stack: { Screen: ({ children }) => children },
  router: { push: jest.fn() },
}));

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    withTransactionAsync: jest.fn().mockImplementation(async (fn) => fn()),
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

jest.mock('expo-local-authentication', () => ({
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  BiometricType: { FACE: 'face', FINGERPRINT: 'fingerprint' },
  AuthenticationType: { BIOMETRIC: 'biometric', DEVICE_CREDENTIAL: 'device_credential' },
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationHandler: jest.fn(),
}));

jest.mock('expo-calendar', () => ({
  getCalendarsAsync: jest.fn().mockResolvedValue([]),
  requestCalendarPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  createEventAsync: jest.fn(),
  deleteEventAsync: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
  Entypo: 'Entypo',
  Feather: 'Feather',
}));

jest.mock('react-native-gifted-charts', () => ({
  BarChart: 'BarChart',
  PieChart: 'PieChart',
}));

jest.mock('react-native-ui-datepicker', () => ({
  useDefaultStyles: () => ({}),
  default: 'DatePicker',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }) => children,
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  writeAsStringAsync: jest.fn(),
  documentDirectory: '/mock/document/dir/',
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ cancelled: false, assets: [] }),
}));

jest.mock('xlsx', () => ({
  read: jest.fn().mockReturnValue({ SheetNames: [], Sheets: {} }),
  utils: { sheet_to_json: jest.fn().mockReturnValue([]) },
}));

global.__DEV__ = true;