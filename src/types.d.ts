export type Provider = 'Binance' | 'Kucoin' | 'Kraken' | 'Bitfinex' | 'Bitstamp' | 'Okx'

export type WithdrawalFee = {
    asset: string
    network: string
    minimumAmount?: string
    maximumAmount?: string
    fixedAmount?: string
    percentAmount?: string
    enabled: boolean
}

export type DepositFee = {
    asset: string
    network: string
    address: string
    minimumAmount?: string
    maximumAmount?: string
    fixedAmount?: string
    percentAmount?: string
    enabled: boolean
}

export type ProviderInformation = {
    provider: Provider
    makerFee: string
    takerFee: string
    withdrawalFees: WithdrawalFee[]
    depositFees: DepositFee[]
}

export type ProviderInformationList = ProviderInformation[]

export type Order = {
    price: string,
    amount: string
}

export type SymbolPair = {
    provider: Provider
    baseAsset: string
    baseMinimalAmount?: string
    baseMaximalAmount?: string
    quoteAsset: string
    quoteMinimalAmount?: string
    quoteMaximalAmount?: string
    //enabledTrading: boolean
    bids: Order[]
    asks: Order[]
    lastUpdateAt: number
}

export type SymbolPairList = SymbolPair[]

export type AssetRecord = {
    index: number
    asset: string
    amount: string
    provider: Provider
}

export type ExchangeStep = {
    step: number,
    symbolPair: SymbolPair
    startAsset: string
    startAmount: string
    startProvider: Provider
    tradingFeeAmount: string
    tradingFeeAsset: string
    endAsset: string
    endAmountSubtotal: string
    endAmountTotal: string
    endProvider: Provider
    risk: number
}

export type Opportunity = {
    startAsset: string
    startAmount: string
    startProvider: Provider
    endAsset?: string
    endAmount?: string
    endProvider?: Provider
    withdrawals: number,
    withdrawalsFee?: string,
    valueChange?: string
    records: AssetRecord[]
    steps: ExchangeStep[]
}

export type OpportunityList = Opportunity[]
