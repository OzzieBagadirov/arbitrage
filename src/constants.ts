const BINANCE_API_KEY = process.env.BINANCE_API_KEY!
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET!

const LOGGING = process.env.LOGGING! === 'true'
const LOGGING_LEVEL = process.env.LOGGING_LEVEL!

const DEPTH = parseInt(process.env.DEPTH!)
const COIN = process.env.COIN!

export const Constant = {
    BINANCE_API_KEY,
    BINANCE_API_SECRET,
    LOGGING,
    LOGGING_LEVEL,
    DEPTH,
    COIN
}