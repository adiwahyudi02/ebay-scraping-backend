/**
 * Returns the closest _ipg (items per page) value supported by eBay,
 * based on the requested size.
 * eBay only supports 60, 120, and 240 as valid _ipg values.
 *
 * @param size - The number of items requested
 * @returns The smallest _ipg value that can accommodate the requested size
 */
export const getClosestIpg = (size: number): number => {
  if (size <= 60) return 60;
  if (size <= 120) return 120;
  return 240;
};
