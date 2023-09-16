import { OpportunityList, Provider, ProviderInformationList, SymbolPairList } from './types';

export const Storage = {
    pairs: [] as SymbolPairList,
    providers: [
        {
            provider: "Binance",
            depositFees: [],
            withdrawalFees: [],
            makerFee: "0.001",
            takerFee: "0.001"
        },
        {
            provider: "Kucoin",
            depositFees: [],
            withdrawalFees: [],
            makerFee: "0.001",
            takerFee: "0.001"
        },
        {
            provider: "Kraken",
            depositFees: [],
            withdrawalFees: [],
            makerFee: "0.0026",
            takerFee: "0.0026"
        },
        {
            provider: "Okx",
            depositFees: [],
            withdrawalFees: [],
            makerFee: "0.0008",
            takerFee: "0.001"
        }
    ] as ProviderInformationList,
    opportunities: [] as OpportunityList,
    errors: {} as any,

    getEnabledPairs: () => Storage.pairs.filter(pair => pair),

    getPairsByAsset: (baseAsset?: string | null, quoteAsset?: string | null) => Storage.pairs.filter(pair => {
        return (baseAsset != null && baseAsset === pair.baseAsset) || (quoteAsset != null && pair.quoteAsset === quoteAsset)
    }),

    getPairsByProvider: (provider: Provider) => {
        return Storage.pairs.filter(pair => pair.provider === provider)
    },

    findPair: (firstAsset: string, secondAsset: string, provider: Provider): number => {
        return Storage.pairs.findIndex((pair) => {
            pair.baseAsset === firstAsset && pair.quoteAsset === secondAsset && pair.provider === provider
            ||
            pair.baseAsset === secondAsset && pair.quoteAsset === firstAsset && pair.provider === provider
        })
    },

    formatSymbols: (provider: Provider): string[] => {
        return Storage.getPairsByProvider(provider).flatMap(pair => {
            if (provider === "Binance") return pair.baseAsset + pair.quoteAsset
            else if (provider === "Kucoin") return `${pair.baseAsset}-${pair.quoteAsset}`
            else if (provider === "Kraken") return `${pair.baseAsset}${pair.quoteAsset}`
            else if (provider === "Okx") return `${pair.baseAsset}-${pair.quoteAsset}`
            else return pair.baseAsset + pair.quoteAsset
        })
    },

    findPairBySymbol: (symbol: string, provider: Provider) => {
        return Storage.pairs.findIndex((pair) => {
            return provider === 'Binance' && pair.provider === provider && symbol === `${pair.baseAsset}${pair.quoteAsset}`
                ||
                provider === 'Kucoin' && pair.provider === provider && symbol === `${pair.baseAsset}-${pair.quoteAsset}`
                ||
                provider === 'Kraken' && pair.provider === provider && symbol === `${pair.baseAsset}${pair.quoteAsset}`
                ||
                provider === 'Okx' && pair.provider === provider && symbol === `${pair.baseAsset}${pair.quoteAsset}`
        })
    },

    getProvider: (provider: Provider) => {
        return Storage.providers.find(prov=> prov.provider === provider)
    }
}