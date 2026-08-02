import React from 'react';
import { Text, Button } from 'react-native';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
}));

const mockGetColorScheme = jest.fn(() => 'light');
const mockRemove = jest.fn();
const mockAddChangeListener = jest.fn((_: { colorScheme: string }) => ({ remove: mockRemove }));
jest.mock('react-native/Libraries/Utilities/Appearance', () => ({
  getColorScheme: mockGetColorScheme,
  addChangeListener: mockAddChangeListener,
  removeChangeListener: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Stack: { Screen: ({ children }: { children: React.ReactNode }) => children },
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
    const r = await renderWithTheme();

    const themeName = await r.findByTestId('theme-name');
    expect(themeName.props.children).toBe('auto');

    const bgColor = await r.findByTestId('bg-color');
    expect(bgColor.props.children).toBe(darkTheme.colors.background);

    const textColor = await r.findByTestId('text-color');
    expect(textColor.props.children).toBe(darkTheme.colors.textPrimary);

    const isDark = await r.findByTestId('is-dark');
    expect(isDark.props.children).toBe('true');
  });

  it('provides light theme when system is light', async () => {
    const r = await renderWithTheme();

    const bgColor = await r.findByTestId('bg-color');
    expect(bgColor.props.children).toBe(lightTheme.colors.background);

    const textColor = await r.findByTestId('text-color');
    expect(textColor.props.children).toBe(lightTheme.colors.textPrimary);

    const isDark = await r.findByTestId('is-dark');
    expect(isDark.props.children).toBe('false');
  });

  it('toggles between dark and light theme', async () => {
    const r = await renderWithTheme();

    await r.findByTestId('bg-color');

    const initialBg = r.getByTestId('bg-color').props.children;
    const initialIsDark = r.getByTestId('is-dark').props.children;

    await act(() => fireEvent.press(r.getByTestId('toggle-btn')));

    await waitFor(() => {
      const newBg = r.getByTestId('bg-color').props.children;
      const newIsDark = r.getByTestId('is-dark').props.children;
      expect(newBg).not.toBe(initialBg);
      expect(newIsDark).not.toBe(initialIsDark);
    });
  });

  it('cycles through auto -> dark -> light -> auto', async () => {
    const r = await renderWithTheme();

    const themeName = await r.findByTestId('theme-name');
    expect(themeName.props.children).toBe('auto');

    await act(() => fireEvent.press(r.getByTestId('cycle-btn')));
    await waitFor(() => {
      expect(r.getByTestId('theme-name').props.children).toBe('dark');
    });

    await act(() => fireEvent.press(r.getByTestId('cycle-btn')));
    await waitFor(() => {
      expect(r.getByTestId('theme-name').props.children).toBe('light');
    });

    await act(() => fireEvent.press(r.getByTestId('cycle-btn')));
    await waitFor(() => {
      expect(r.getByTestId('theme-name').props.children).toBe('auto');
    });
  });

  it('follows live system theme changes while in auto mode', async () => {
    mockGetColorScheme.mockReturnValue('light');
    const r = await renderWithTheme();

    await r.findByTestId('bg-color');
    expect(r.getByTestId('bg-color').props.children).toBe(lightTheme.colors.background);

    const handler = mockAddChangeListener.mock.calls[0][0] as unknown as (
      p: { colorScheme: string }
    ) => void;

    await act(() => handler({ colorScheme: 'dark' }));

    await waitFor(() => {
      expect(r.getByTestId('bg-color').props.children).toBe(darkTheme.colors.background);
      expect(r.getByTestId('is-dark').props.children).toBe('true');
    });
  });

  it('throws error when useTheme is used outside provider', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const OutsideComponent = () => {
      useTheme();
      return null;
    };

    await expect(render(<OutsideComponent />)).rejects.toThrow(
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
