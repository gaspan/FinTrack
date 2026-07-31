import React from 'react';
import { Text, Button } from 'react-native';
import { render, act, fireEvent, waitFor, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
}));

const mockGetColorScheme = jest.fn(() => 'light');
const mockRemove = jest.fn();
const mockAddChangeListener = jest.fn(() => ({ remove: mockRemove }));
jest.mock('react-native/Libraries/Utilities/Appearance', () => ({
  getColorScheme: mockGetColorScheme,
  addChangeListener: mockAddChangeListener,
  removeChangeListener: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Stack: { Screen: ({ children }) => children },
}));

import { ThemeProvider, useTheme, darkTheme, lightTheme } from '@/constants/theme';

const TestComponent = () => {
  const { theme, isDark, themeName, toggleTheme, cycleTheme } = useTheme();
  return (
    <React.Fragment>
      <Text testID="theme-name">{themeName}</Text>
      <Text testID="is-dark">{String(isDark)}</Text>
      <Text testID="bg-color">{theme.colors.background}</Text>
      <Text testID="text-color">{theme.colors.textPrimary}</Text>
      <Button testID="toggle-btn" onPress={toggleTheme} title="Toggle" />
      <Button testID="cycle-btn" onPress={cycleTheme} title="Cycle" />
    </React.Fragment>
  );
};

const Wrapper = ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetColorScheme.mockReturnValue('light');
    mockAddChangeListener.mockReturnValue({ remove: mockRemove });
  });

  const renderWithTheme = () => render(
    <Wrapper>
      <TestComponent />
    </Wrapper>
  );

  it('provides dark theme by default when system is dark', async () => {
    mockGetColorScheme.mockReturnValue('dark');
    renderWithTheme();

    const themeName = await screen.findByTestId('theme-name');
    expect(themeName.props.children).toBe('auto');

    const bgColor = await screen.findByTestId('bg-color');
    expect(bgColor.props.children).toBe(darkTheme.colors.background);

    const textColor = await screen.findByTestId('text-color');
    expect(textColor.props.children).toBe(darkTheme.colors.textPrimary);

    const isDark = await screen.findByTestId('is-dark');
    expect(isDark.props.children).toBe('true');
  });

  it('provides light theme when system is light', async () => {
    renderWithTheme();

    const bgColor = await screen.findByTestId('bg-color');
    expect(bgColor.props.children).toBe(lightTheme.colors.background);

    const textColor = await screen.findByTestId('text-color');
    expect(textColor.props.children).toBe(lightTheme.colors.textPrimary);

    const isDark = await screen.findByTestId('is-dark');
    expect(isDark.props.children).toBe('false');
  });

  it('toggles between dark and light theme', async () => {
    renderWithTheme();

    await screen.findByTestId('bg-color');

    const initialBg = screen.getByTestId('bg-color').props.children;
    const initialIsDark = screen.getByTestId('is-dark').props.children;

    await act(async () => {
      fireEvent.press(screen.getByTestId('toggle-btn'));
    });

    await waitFor(() => {
      const newBg = screen.getByTestId('bg-color').props.children;
      const newIsDark = screen.getByTestId('is-dark').props.children;
      expect(newBg).not.toBe(initialBg);
      expect(newIsDark).not.toBe(initialIsDark);
    });
  });

  it('cycles through auto -> dark -> light -> auto', async () => {
    renderWithTheme();

    const themeName = await screen.findByTestId('theme-name');
    expect(themeName.props.children).toBe('auto');

    await act(async () => {
      fireEvent.press(screen.getByTestId('cycle-btn'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('theme-name').props.children).toBe('dark');
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('cycle-btn'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('theme-name').props.children).toBe('light');
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('cycle-btn'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('theme-name').props.children).toBe('auto');
    });
  });

  it('follows live system theme changes while in auto mode', async () => {
    mockGetColorScheme.mockReturnValue('light');
    renderWithTheme();

    await screen.findByTestId('bg-color');
    expect(screen.getByTestId('bg-color').props.children).toBe(lightTheme.colors.background);

    const handler = mockAddChangeListener.mock.calls[0][0] as unknown as (
      p: { colorScheme: string }
    ) => void;

    await act(async () => {
      handler({ colorScheme: 'dark' });
    });

    await waitFor(() => {
      expect(screen.getByTestId('bg-color').props.children).toBe(darkTheme.colors.background);
      expect(screen.getByTestId('is-dark').props.children).toBe('true');
    });
  });

  it('throws error when useTheme is used outside provider', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const OutsideComponent = () => {
      useTheme();
      return null;
    };

    expect(() => render(<OutsideComponent />)).toThrow(
      'useTheme must be used within a ThemeProvider'
    );

    consoleError.mockRestore();
  });
});

describe('Theme Objects', () => {
  it('darkTheme has correct structure', () => {
    expect(darkTheme.colors).toBeDefined();
    expect(darkTheme.spacing).toBeDefined();
    expect(darkTheme.radius).toBeDefined();
    expect(darkTheme.typography).toBeDefined();

    expect(darkTheme.colors.background).toBe('#0A0E1A');
    expect(darkTheme.colors.primary).toBe('#00D09C');
    expect(darkTheme.colors.textPrimary).toBe('#FFFFFF');
  });

  it('lightTheme has correct structure', () => {
    expect(lightTheme.colors).toBeDefined();
    expect(lightTheme.spacing).toBeDefined();
    expect(lightTheme.radius).toBeDefined();
    expect(lightTheme.typography).toBeDefined();

    expect(lightTheme.colors.background).toBe('#F8F9FA');
    expect(lightTheme.colors.primary).toBe('#00D09C');
    expect(lightTheme.colors.textPrimary).toBe('#1A1A2E');
  });

  it('both themes share same spacing, radius, and typography keys', () => {
    const spacingKeys = Object.keys(darkTheme.spacing);
    const radiusKeys = Object.keys(darkTheme.radius);
    const typoKeys = Object.keys(darkTheme.typography);

    expect(Object.keys(lightTheme.spacing)).toEqual(spacingKeys);
    expect(Object.keys(lightTheme.radius)).toEqual(radiusKeys);
    expect(Object.keys(lightTheme.typography)).toEqual(typoKeys);
  });
});