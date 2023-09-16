import { Constant } from "../constants"

export const Logger = {
    log: (tag: string, message: string, type: 'info' | 'warn' | 'error' = 'info') => {
        if (Constant.LOGGING) {
            if (type === 'info') console.info(`[INFO] ${tag} - ${message}`)
            else if (type === 'warn' && (Constant.LOGGING_LEVEL === 'warn' || Constant.LOGGING_LEVEL === 'error')) console.warn(`[WARN] ${tag} - ${message}`)
            else if (type === 'error' && Constant.LOGGING_LEVEL === 'error') console.error(`[ERROR] ${tag} - ${message}`)
        }
    },
    time: (tag: string, message: string, type: 'info' | 'warn' | 'error' = 'info') => {
        if (Constant.LOGGING) {
            if (type === 'info') console.time(`[INFO] ${tag} - ${message}`)
            else if (type === 'warn' && (Constant.LOGGING_LEVEL === 'warn' || Constant.LOGGING_LEVEL === 'error')) console.time(`[WARN] ${tag} - ${message}`)
            else if (type === 'error' && Constant.LOGGING_LEVEL === 'error') console.time(`[ERROR] ${tag} - ${message}`)
        }
    },
    timeEnd: (tag: string, message: string, type: 'info' | 'warn' | 'error' = 'info') => {
        if (Constant.LOGGING) {
            if (type === 'info') console.timeEnd(`[INFO] ${tag} - ${message}`)
            else if (type === 'warn' && (Constant.LOGGING_LEVEL === 'warn' || Constant.LOGGING_LEVEL === 'error')) console.timeEnd(`WARN] ${tag} - ${message}`)
            else if (type === 'error' && Constant.LOGGING_LEVEL === 'error') console.timeEnd(`[ERROR] ${tag} - ${message}`)
        }
    },
}