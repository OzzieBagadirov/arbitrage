import { Constant } from './constants';
import { calculateOpportunities, getBestOpportunities, getSymbols, updateTickers } from './jobs';
import { Provider } from './types';
import { Logger } from './utils/logger';

async function main() {
  Logger.log("Start", "Initiating the arbitrage bot")

  const startAmount = "0.56"
  const startMarket: Provider = 'Binance'

  await getSymbols()
  await updateTickers()

  setInterval(() => {
    calculateOpportunities(startAmount, Constant.COIN, startMarket)
    getBestOpportunities(100, Constant.COIN)
  }, 3000)

  setInterval(updateTickers, 3000)

  // await binance.connectMarketStream();
  // binance.subscribeDepthStream();
}

main()
