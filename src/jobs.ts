import BigNumber from 'bignumber.js';
import moment from 'moment';

import { getNextPair } from './engine';
import binance from './exchange/binance';
import kraken from './exchange/kraken';
import kucoin from './exchange/kucoin';
import okx from './exchange/okx';
import { Storage } from './storage';
import { OpportunityList, Provider } from './types';
import { Logger } from './utils/logger';

export const getSymbols = async () => {
  Logger.time("Symbols", "Fetching symbols...")
  await binance.getSymbols()
  await kucoin.getSymbols()
  await kraken.getSymbols()
  await okx.getSymbols()
  Logger.timeEnd("Symbols", "Fetching symbols...")
  Logger.log("Symbols", "Got symbols: " + Storage.pairs.length)
}

export const updateTickers = async () => {
  if (!Storage.errors.apiLimit) {
    Logger.time("Tickers", "Fetching tickers...")
    await binance.getTickers()
    await kucoin.getTickers()
    await kraken.getTickers()
    await okx.getTickers()
    Logger.timeEnd("Tickers", "Fetching tickers...")
    Logger.log("Tickers", "Got tickers!")
  } else {
    Logger.log("Tickers", "API error while fetching tickers...", "error")
  }
}

export const calculateOpportunities = async (amount: string, asset: string, provider: Provider) => {
    Logger.time("Opportunities", "Calculating opportunities...")
    const bufferOpportunities: OpportunityList = []
    getNextPair({
      opportunity: {
        startAmount: amount,
        startAsset: asset,
        startProvider: provider,
        withdrawals: 1,
        records: [{ index: 0, provider: provider, asset: asset, amount: amount }],
        steps: []
      },
      opportunities: bufferOpportunities
    })
    Logger.timeEnd("Opportunities", "Calculating opportunities...")
    Logger.log("Opportunities", "Total opportunities number: " + bufferOpportunities.length)

    Storage.opportunities = [ ...bufferOpportunities ]
}

export const getBestOpportunities = async (amount: number, outputAsset?: string) => {
  const opportunities = Storage.opportunities
    .filter(opp => !outputAsset || opp.endAsset === outputAsset)
    .sort((a, b) => BigNumber(b.valueChange || "-10").minus(a.valueChange || "-10").toNumber())

  for (let index = amount; index >= 0; index--) {
    const opportunity = opportunities[index];

    if (!opportunity) continue;

    if (opportunity.endAmount === undefined || opportunity.valueChange === undefined) continue;

    console.log(`--------------------------------------------------------------------------------------------------------------------------------------`)

    console.log(
      `${moment().format("LTS")} - [OPPORTUNITY] #${index + 1} | Profit ${BigNumber(opportunity.valueChange).multipliedBy(100).toFixed(4)}% | Steps ${opportunity.steps.length} | ` + 
      `${BigNumber(opportunity.startAmount).toFixed(5)}/`  +
      `${BigNumber(opportunity.endAmount).toFixed(5)} (${BigNumber(opportunity.endAmount).minus(opportunity.startAmount).toFixed(5)}) | ` +
      `Withdrawals: ${opportunity.withdrawals} ${opportunity.withdrawalsFee}`
    )

    opportunity.steps.forEach(step => {
      console.log(
        `${moment().format("LTS")} - [DETAILS]\t\t` + 
        `${step.step}.  ` +
        `${BigNumber(step.startAmount).toFixed(5)} ${step.startAsset} / ${BigNumber(step.endAmountTotal).toFixed(5)} ${step.endAsset} (${BigNumber(step.symbolPair.bids[0].price)}/${BigNumber(step.symbolPair.asks[0].price)} ${step.symbolPair.baseAsset + step.symbolPair.quoteAsset}) | ${step.startProvider}/${step.endProvider} | ${step.risk}` +
        //`\n\t\t\t\t\t$${BigNumber(step.valueStartUsd).toFixed(2)} / $${BigNumber(step.valueEndUsd).toFixed(2)} (${BigNumber(step.valueChange).multipliedBy(100).toFixed(4)}%)` +
        ``
      )
    })
  }
  console.log("====================================================================================================================================")
}