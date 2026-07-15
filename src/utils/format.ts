export const formatRupiah = (val: number) => {
  return `Rp ${val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

export const formatRupiahNumberOnly = (val: number) => {
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const formatRupiahShort = (val: number) => {
  if (Math.abs(val) >= 1000000) {
    return `Rp ${(val / 1000000).toFixed(1).replace(/\.0$/, '')}jt`;
  }
  if (Math.abs(val) >= 1000) {
    return `Rp ${(val / 1000).toFixed(1).replace(/\.0$/, '')}rb`;
  }
  return formatRupiah(val);
};
