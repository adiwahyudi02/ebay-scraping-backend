import { PROXIES } from '../constants/proxy.constant';

export const rotateProxy = () => {
  return PROXIES[Math.floor(Math.random() * PROXIES.length)];
};
