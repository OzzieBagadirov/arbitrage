
import axios from 'axios';

import { Storage } from '../storage';
import { Logger } from '../utils/logger';

/************************************************************************************************/

const BASE_URL_OKX = `https://www.okx.com`
const TICKERS_API_OKX = `${BASE_URL_OKX}/api/v5/market/tickers?instType=SPOT`

/************************************************************************************************/

const getSymbolsAndTickers = async (): Promise<void> => {
    const { data, status } = await axios.get(`${TICKERS_API_OKX}`)

    Logger.log(`Okx`, `Fetching symbols and tickers - ${status}`)

    if (status >= 400) {
        Storage.errors.apiLimit = true
        return;
    }

    data.data.forEach(symbol => {
        const index = Storage.findPairBySymbol(symbol.instId, 'Okx')

        const baseAsset = symbol.instId.split('-')[0]
        const quoteAsset = symbol.instId.split('-')[1]

        if (index === -1) {
            Storage.pairs.push({
                baseAsset: baseAsset,
                quoteAsset: quoteAsset,
                bids: [{ price: symbol.bidPx, amount: symbol.bidSz }],
                asks: [{ price: symbol.askPx, amount: symbol.askSz }],
                provider: "Okx",
                lastUpdateAt: Date.now()
            })
            return;
        }

        if (index !== -1) {
            Storage.pairs[index].baseAsset = baseAsset,
            Storage.pairs[index].quoteAsset = quoteAsset,
            Storage.pairs[index].bids = [{ price: symbol.bidPx, amount: symbol.bidSz }],
            Storage.pairs[index].asks = [{ price: symbol.askPx, amount: symbol.askSz }],
            Storage.pairs[index].provider = "Okx",
            Storage.pairs[index].lastUpdateAt = Date.now()
        }
    });
}

/************************************************************************************************/

export default {
    getSymbols: getSymbolsAndTickers,
    getTickers: getSymbolsAndTickers
}