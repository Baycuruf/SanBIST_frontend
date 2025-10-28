// src/state/atoms.js
import { atom } from 'recoil';

export const userState = atom({
  key: 'userState',
  default: null
});

export const portfolioState = atom({
  key: 'portfolioState',
  default: []
});

export const marketDataState = atom({
  key: 'marketDataState',
  default: []
});

export const virtualBalanceState = atom({
  key: 'virtualBalanceState',
  default: 100000
});