import BigNumber from 'bignumber.js';
import moment from 'moment';

import { Constant } from './constants';
import { Storage } from './storage';
import { AssetRecord, ExchangeStep, Opportunity, OpportunityList, Provider } from './types';
import { Logger } from './utils/logger';

export const getNextPair = (
  input: { 
    opportunity: Opportunity,       // Chain of steps done before
    opportunities: OpportunityList  // Result opportunities array
  }
) => {
  // Getting the last asset we currently have
  const previousAssetRecord = input.opportunity.records[input.opportunity.records.length - 1]
  const startAsset = previousAssetRecord.asset
  const startAmount = BigNumber(previousAssetRecord.amount)
  const startProvider = previousAssetRecord.provider
  const step = previousAssetRecord.index

  const withdrawalFee = BigNumber(0.0005)
  
  // Getting available symbol pair for current asset for selling and buying.
  const availablePairs = //step !== Constant.DEPTH - 1 ? 
    Storage.getPairsByAsset(startAsset).concat(Storage.getPairsByAsset(null, startAsset)) //:
    //Storage.getPairsByAsset(startAsset, input.opportunity.startAsset).concat(Storage.getPairsByAsset(input.opportunity.startAsset, startAsset))

  // Checking if this is completed chain of steps
  if (input.opportunity.steps.length >= 2) {
    const withdrawalsFee = withdrawalFee.multipliedBy(input.opportunity.withdrawals)
    
    const endAsset = previousAssetRecord.asset
    const endAmount = BigNumber(previousAssetRecord.amount).minus(withdrawalsFee)
    const endProvider = previousAssetRecord.provider

    const finalOpportunity: Opportunity = {
      ...input.opportunity,
      endAsset: endAsset,
      endAmount: endAmount.toString(),
      endProvider: endProvider,
      withdrawalsFee: withdrawalsFee.toFixed(5),
      valueChange: endAmount.dividedBy(input.opportunity.startAmount).minus(1).toFixed(10)
    }

    if (BigNumber(finalOpportunity.valueChange!).gte(-100)) input.opportunities.push(finalOpportunity)

    if(step === Constant.DEPTH) return;
  }

  // Iterating through available next steps
  for (let index = 0; index < availablePairs.length; index++) {
    const pair = availablePairs[index]; // Current symbol pair
    let risk = 0                        // Number that represents the risk of current pair exchange 

    // Check if asks or bids are not present in the current pair
    if (pair.asks.length === 0 || pair.bids.length === 0) { 
      Logger.log("Engine", `Skipping sybmol ${pair.baseAsset + pair.quoteAsset}, missing bids and asks`, `warn`) 
      return; 
    }

    // Check if last asks and bids update was more than 2 seconds ago
    if (moment().diff(pair.lastUpdateAt, "millisecond") >= 2000) { 
      Logger.log(`Engine`, `Risk sybmol ${pair.baseAsset + pair.quoteAsset}, last update > 2 sec`, `warn`) 
      risk += 1
    }

    // Check if this symbol pair contains asset that was already used
    //if (excludeAssets.includes(pair.baseAsset) || excludeAssets.includes(pair.quoteAsset)) return;

    // Sell price is set to the best bid price
    const pairSellPrice = BigNumber(pair.bids[0].price)
    const pairSellAvailableAmount = BigNumber(pair.bids[0].amount)
    // Buy price is set to the best ask price
    const pairBuyPrice = BigNumber(pair.asks[0].price)
    const pairBuyAvailableAmount = BigNumber(pair.asks[0].amount)

    // Preparing next asset variables
    let endAsset: string | undefined = undefined
    let endAmountSubtotal: BigNumber | undefined = undefined
    let endProvider: Provider | undefined = undefined

    // Case when current asset is the BASE asset in the current pair of symbols
    if (pair.baseAsset === startAsset) {

      // Checking risk of the insufficient bid amount with this price
      if (startAmount.isGreaterThan(pairSellAvailableAmount)) { 
        Logger.log(`Engine`, `Risk sybmol ${pair.baseAsset + pair.quoteAsset}, insufficient amount`, `warn`) 
        risk += startAmount.dividedBy(pairSellAvailableAmount).toNumber()
      }

      // Updating the next asset
      endAsset = pair.quoteAsset
      endAmountSubtotal = startAmount.multipliedBy(pairSellPrice)
      endProvider = pair.provider
    } 

    // Case when current asset is the QUOTE asset in the current pair of symbols
    else if (pair.quoteAsset === startAsset) {

      // Checking risk of the insufficient ask amount with this price
      if (startAmount.isGreaterThan(pairBuyAvailableAmount)) { 
        Logger.log(`Engine`, `Risk sybmol ${pair.baseAsset + pair.quoteAsset}, insufficient amount`, `warn`) 
        risk += startAmount.dividedBy(pairBuyAvailableAmount).toNumber()
      }

      // Updating the next asset
      endAsset = pair.baseAsset
      endAmountSubtotal = startAmount.dividedBy(pairBuyPrice)
      endProvider = pair.provider
    } 

    // Checks if one of the next asset required fields is missing
    if (endAsset === undefined || endAmountSubtotal === undefined || endProvider === undefined) { 
      Logger.log("Engine", `Skipping sybmol ${pair.baseAsset + pair.quoteAsset}, something gone wrong`, `warn`) 
      return; 
    }

    const provider = Storage.getProvider(pair.provider)

    if (provider === undefined) { 
      Logger.log("Engine", `Skipping sybmol ${pair.baseAsset + pair.quoteAsset}, cannot get fees`, `warn`) 
      return; 
    }

    const fees = BigNumber(provider.takerFee)

    const tradingFeeAmount = endAmountSubtotal.multipliedBy(fees)
    const endAmountTotal = endAmountSubtotal.minus(tradingFeeAmount)

    // Preparing asset record for end asset
    const nextAssetRecord: AssetRecord = {
      index: step + 1,
      asset: endAsset,
      amount: endAmountTotal.toString(),
      provider: endProvider
    }

    // Preparing current exchange step record
    const currentExchangeStep: ExchangeStep = {
      step: step,
      symbolPair: pair,
      startAsset: startAsset,
      startAmount: startAmount.toString(),
      startProvider: startProvider,
      tradingFeeAmount: tradingFeeAmount.toString(),
      tradingFeeAsset: endAsset,
      endAsset: endAsset,
      endAmountSubtotal: endAmountSubtotal.toString(),
      endAmountTotal: endAmountTotal.toString(),
      endProvider: endProvider,
      risk: risk
    }

    // Updating opportunity to go forward
    const updatedOpportunity: Opportunity = {
      ...input.opportunity,
      withdrawals: startProvider !== endProvider ? input.opportunity.withdrawals + 1 : input.opportunity.withdrawals,
      records: [...input.opportunity.records, nextAssetRecord],
      steps: [...input.opportunity.steps, currentExchangeStep]
    }

    // Since current step wasn't last we have to calculate all possible next steps for current chain of steps
    getNextPair({
        opportunity: updatedOpportunity, 
        opportunities: input.opportunities
    }) 
  }
}