declare module 'rate-limiter-flexible' {
  export class RateLimiterMemory {
    constructor(options: {
      points: number
      duration: number
    })
    consume(key: string): Promise<void>
    penalty(key: string): Promise<void>
    reward(key: string): Promise<void>
    get(key: string): Promise<any>
    delete(key: string): Promise<any>
    block(key: string, secDuration: number): Promise<any>
    getRateLimiterRes(rlKey: any, changedPoints: any): any
  }

  export class RateLimiterRedis {
    constructor(options: any)
  }

  export class RateLimiterCluster {
    constructor(options: any)
  }
}
