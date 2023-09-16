import axios from 'axios';
import BigNumber from 'bignumber.js';
import Crypto from 'crypto-js';
import { WebSocket } from 'ws';

import { Spot } from '@binance/connector';

import { Constant } from '../constants';
import { Storage } from '../storage';
import { Order, SymbolPair } from '../types';
import { Logger } from '../utils/logger';

const client = new Spot(Constant.BINANCE_API_KEY, Constant.BINANCE_API_SECRET)

let pendingStreams: any[] = []

let ws: WebSocket | undefined = undefined

/************************************************************************************************/

const FIAT_CURRENCIES_BINANCE = [
    "USD", "ARS", "AED", "AUD", "BRL", "BGN", "BOB", "BHD", "BDT", "CHF", "CNY", "COP", "CAD", "CZK", "DKK",
    "EUR", "EGP", "GBP", "HUF", "HRK", "HKD", "INR", "IDR", "JPY", "KES", "KWD", "KZT", "MAD", "MXN", "MNT",
    "NGN", "NZD", "OMR", "PEN", "PHP", "PKR", "PLN", "QAR", "RUB", "RON", "SAR", "SEK", "TWD", "THB", "TRY",
    "UAH", "UGX", "VND", "VES", "ZAR"
]

const BASE_API_BINANCE = "https://api.binance.com"

const SYMBOLS_API_BINANCE = `${BASE_API_BINANCE}/api/v3/exchangeInfo`
const TICKER_API_BINANCE = `${BASE_API_BINANCE}/api/v3/ticker/bookTicker`
const DEPTH_API_BINANCE = `${BASE_API_BINANCE}/api/v3/depth`

const ALL_COINS_BINANCE = `${BASE_API_BINANCE}/sapi/v1/capital/config/getall`

/************************************************************************************************/

const getTickers = async (): Promise<void> => {
    const symbols = Storage.formatSymbols('Binance')
    const symbolsPerRequest = 500

    for (let index = 0; index < symbols.length / symbolsPerRequest; index++) {
        const symbolsPart = symbols.slice(index * symbolsPerRequest, (index + 1) * symbolsPerRequest).join(`","`)
        const { data, status } = await axios.get(`${TICKER_API_BINANCE}?symbols=["${symbolsPart}"]`)

        Logger.log(`Binance`, `Fetching tickers #${index} - ${status}`)
        if (status >= 400) {
            Storage.errors.apiLimit = true
            break;
        }

        data.forEach((ticker: { symbol: string; bidPrice: string; bidQty: string; askPrice: string; askQty: string; }) => {
            const index = Storage.findPairBySymbol(ticker.symbol, 'Binance')

            if (index === -1) return;

            Storage.pairs[index].bids = [{ price: ticker.bidPrice, amount: ticker.bidQty }]
            Storage.pairs[index].asks = [{ price: ticker.askPrice, amount: ticker.askQty }]
            Storage.pairs[index].lastUpdateAt = Date.now()
        });
    }
}

const getSymbols = async (): Promise<void> => {
    const { data, status } = await axios.get(`${SYMBOLS_API_BINANCE}?permissions=["SPOT"]`)

    Logger.log(`Binance`, `Fetching symbols - ${status}`)

    data.symbols.forEach((symbol) => {
        const pairIndex = Storage.findPair(symbol.baseAsset, symbol.quoteAsset, "Binance")

        if (FIAT_CURRENCIES_BINANCE.includes(symbol.baseAsset) || FIAT_CURRENCIES_BINANCE.includes(symbol.quoteAsset)) return;

        if (pairIndex === -1 && symbol.status === 'TRADING') {
            Storage.pairs.push({
                provider: "Binance",
                baseAsset: symbol.baseAsset,
                quoteAsset: symbol.quoteAsset,
                bids: [] as Order[],
                asks: [] as Order[]
            } as SymbolPair)
        }
    });
}

const getDepth = async (symbol: string): Promise<void> => {
    const depth = await axios.get(`${DEPTH_API_BINANCE}?symbol=${symbol}`)
    return depth.data
}

/************************************************************************************************/

const getWithdrawalFees = async (): Promise<void> => {
    const symbols = await axios.get(`${ALL_COINS_BINANCE}?permissions=["SPOT"]`, {
        headers: {
            'X-MBX-APIKEY': Constant.BINANCE_API_KEY
        }
    })
    return symbols.data
}

const connectMarketStream = () => new Promise<void>((resolve, reject) => {
    ws = new WebSocket('wss://data-stream.binance.com/stream')

    ws.on('close', (code, reason) => {
        console.log(code, reason.toString('ascii'))
    })

    ws.on('upgrade', (message) => {
        console.log(message.toString())
    })

    ws.on('unexpected-response', (req, res) => {
        console.log(`Unexpected response ${JSON.stringify(res)}`)
    })

    ws.on('error', (err) => {
        console.error(err)
    })

    ws.on('message', (message) => {
        const response = JSON.parse(message.toString())

        if (response.result === null) pendingStreams = pendingStreams.filter(pending => { pending.id !== response.id })
        else if (response.stream) {
            const { s: symbol, b: bids, a: asks } = response.data

            const pairIndex = Storage.findPairBySymbol(symbol, "Binance")

            if (pairIndex === -1) return;

            const updatedBids = [...Storage.pairs[pairIndex].bids]
            const updatedAsks = [...Storage.pairs[pairIndex].asks]

            bids.forEach(bid => {
                const bidIndex = updatedBids.findIndex(uB => uB.price === bid[0])

                if (bidIndex === -1 && bid[1] !== "0") {
                    updatedBids.push({ price: bid[0], amount: bid[1] })
                }
                else if (bidIndex !== -1 && bid[1] !== "0") {
                    updatedBids[bidIndex].amount = bid[1]
                }
                else if (bidIndex !== -1 && bid[0] === "0") {
                    updatedBids.splice(bidIndex, 1)
                }
            });

            asks.forEach(ask => {
                const askIndex = updatedAsks.findIndex(uA => uA.price === ask[0])

                if (askIndex === -1 && ask[1] !== "0") {
                    updatedAsks.push({ price: ask[0], amount: ask[1] })
                }
                else if (askIndex !== -1 && ask[1] !== "0") {
                    updatedAsks[askIndex].amount = ask[1]
                }
                else if (askIndex !== -1 && ask[0] === "0") {
                    updatedAsks.splice(askIndex, 1)
                }
            });

            Storage.pairs[pairIndex].bids = [...updatedBids.sort((a, b) => BigNumber(b.price).minus(a.price).toNumber())]
            Storage.pairs[pairIndex].asks = [...updatedAsks.sort((a, b) => BigNumber(b.price).minus(a.price).toNumber())]
        }
    })

    ws.on('open', () => {
        console.log(`Binance`, `Connected to the data stream`)
        resolve()
    })
})


const subscribeDepthStream = () => {
    if (!ws) {
        console.log(`Binance`, `Data stream is not active`, `error`)
        return;
    }


    const subRequest = {
        "method": "SUBSCRIBE",
        "params": Storage.getPairsByProvider('Binance').filter(pair => pair.baseAsset === "BTC" || pair.quoteAsset === "BTC").flatMap(pair => `${pair.baseAsset.toLowerCase()}${pair.quoteAsset.toLowerCase()}@depth`),
        "id": 1
    }

    ws.send(JSON.stringify(subRequest))

    pendingStreams.push(subRequest)
}

/************************************************************************************************/

export default {
    getSymbols,
    getTickers,
    getDepth,
    getWithdrawalFees,
    connectMarketStream,
    subscribeDepthStream
}