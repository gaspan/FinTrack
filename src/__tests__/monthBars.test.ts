import { takeTopBars } from '@/components/dashboard/MonthBarsCard';

const rows = [
  { value: 50, label: 'A' },
  { value: 300, label: 'B' },
  { value: 150, label: 'C' },
];

describe('takeTopBars', () => {
  it('urut terbesar dulu dari kiri', () => {
    expect(takeTopBars(rows).map((r) => r.label)).toEqual(['B', 'C', 'A']);
  });

  it('batasi N teratas tanpa mutasi input', () => {
    const top = takeTopBars(rows, 2);
    expect(top).toHaveLength(2);
    expect(top[0].label).toBe('B');
    expect(rows[0].label).toBe('A');
  });

  it('aman untuk data kosong', () => {
    expect(takeTopBars([])).toEqual([]);
  });
});
