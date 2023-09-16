import axios from 'axios';

import { Storage } from '../storage';
import { Order } from '../types';
import { Logger } from '../utils/logger';

/************************************************************************************************/

const BASE_URL_KRAKEN = `https://api.kraken.com/0`
const SYMBOLS_API_KRAKEN = `${BASE_URL_KRAKEN}/public/AssetPairs`
const TICKER_API_KRAKEN = `${BASE_URL_KRAKEN}/public/Ticker`

/************************************************************************************************/

const getSymbols = async (): Promise<void> => {
    const { data, status } = await axios.get(`${SYMBOLS_API_KRAKEN}`, { 
        headers: { "Accept-Encoding": "gzip,deflate,compress" } 
      })

    Logger.log(`Kraken`, `Fetching symbols - ${status}`)

    if (status >= 400) {
        Storage.errors.apiLimit = true
        return;
    }

    Object.values<any>(data.result).forEach(symbol => {
        const index = Storage.findPairBySymbol(symbol.symbol, 'Kraken')

        if (index === -1 && symbol.status === "online") {
            Storage.pairs.push({
                baseAsset: symbol.base,
                quoteAsset: symbol.quote,
                provider: "Kraken",
                bids: [] as Order[],
                asks: [] as Order[],
                lastUpdateAt: Date.now()
            })
            return;
        }

        if (index !== -1) {
            Storage.pairs[index].baseAsset = symbol.base,
            Storage.pairs[index].quoteAsset = symbol.quote,
            Storage.pairs[index].provider = "Kraken",
            Storage.pairs[index].lastUpdateAt = Date.now()
        }
    });
}

const getTickers = async (): Promise<void> => {
    const { data, status } = await axios.get(`${TICKER_API_KRAKEN}`, { 
        headers: { "Accept-Encoding": "gzip,deflate,compress" } 
      })

    Logger.log(`Kraken`, `Fetching tickers - ${status}`)

    if (status >= 400) {
        Storage.errors.apiLimit = true
        return;
    }

    Object.keys(data.result).forEach(symbol => {
        const index = Storage.findPairBySymbol(symbol, 'Kraken')

        if (index === -1) return;

        Storage.pairs[index].bids = [{ price: data.result[symbol].b[0], amount: data.result[symbol].b[2] }],
        Storage.pairs[index].asks = [{ price: data.result[symbol].a[0], amount: data.result[symbol].a[2] }],
        Storage.pairs[index].lastUpdateAt = Date.now()
    });
}

/************************************************************************************************/

export default {
    getSymbols,
    getTickers
}