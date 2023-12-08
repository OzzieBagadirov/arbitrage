import axios from 'axios';

import { Storage } from '../storage';
import { Order } from '../types';
import { Logger } from '../utils/logger';

/************************************************************************************************/

const BASE_URL_KUCOIN = `https://api.kucoin.com`;
const SYMBOLS_API_KUCOIN = `${BASE_URL_KUCOIN}/api/v2/symbols`;
const TICKER_API_KUCOIN = `${BASE_URL_KUCOIN}/api/v1/market/allTickers`;

/************************************************************************************************/

const getSymbols = async (): Promise<void> => {
  try {
    const { data, status } = await axios.get(`${SYMBOLS_API_KUCOIN}`, {
      headers: { 'Accept-Encoding': 'gzip,deflate,compress' },
    });

    Logger.log(`Kucoin`, `Fetching symbols - ${status}`);

    if (status >= 400) {
      Storage.errors.apiLimit = true;
      return;
    }

    data.data.forEach((symbol) => {
      const index = Storage.findPairBySymbol(symbol.symbol, 'Kucoin');

      if (index === -1 && symbol.enableTrading) {
        Storage.pairs.push({
          baseAsset: symbol.baseCurrency,
          quoteAsset: symbol.quoteCurrency,
          baseMinimalAmount: symbol.baseMinSize,
          baseMaximalAmount: symbol.baseMaxSize,
          quoteMinimalAmount: symbol.quoteMinSize,
          quoteMaximalAmount: symbol.quoteMaxSize,
          bids: [] as Order[],
          asks: [] as Order[],
          provider: 'Kucoin',
          lastUpdateAt: Date.now(),
        });
        return;
      }

      if (index !== -1) {
        (Storage.pairs[index].baseAsset = symbol.baseCurrency),
          (Storage.pairs[index].quoteAsset = symbol.quoteCurrency),
          (Storage.pairs[index].baseMinimalAmount = symbol.baseMinSize),
          (Storage.pairs[index].baseMaximalAmount = symbol.baseMaxSize),
          (Storage.pairs[index].quoteMinimalAmount = symbol.quoteMinSize),
          (Storage.pairs[index].quoteMaximalAmount = symbol.quoteMaxSize),
          (Storage.pairs[index].provider = 'Kucoin'),
          (Storage.pairs[index].lastUpdateAt = Date.now());
      }
    });
  } catch (e: any) {
    console.error(e.message);
  }
};

const getTickers = async (): Promise<void> => {
  try {
    const { data, status } = await axios.get(`${TICKER_API_KUCOIN}`, {
      headers: { 'Accept-Encoding': 'gzip,deflate,compress' },
    });

    Logger.log(`Kucoin`, `Fetching tickers - ${status}`);

    if (status >= 400) {
      Storage.errors.apiLimit = true;
      return;
    }

    data.data.ticker.forEach((ticker) => {
      const index = Storage.findPairBySymbol(ticker.symbol, 'Kucoin');

      if (index === -1) return;

      (Storage.pairs[index].bids = [{ price: ticker.buy, amount: '0.00' }]),
        (Storage.pairs[index].asks = [{ price: ticker.sell, amount: '0.00' }]),
        (Storage.pairs[index].lastUpdateAt = Date.now());
    });
  } catch (e: any) {
    console.error(e.message);
  }
};

/************************************************************************************************/

export default {
  getSymbols,
  getTickers,
};
