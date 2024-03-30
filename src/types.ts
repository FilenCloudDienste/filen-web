/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never

export type Prettify<T> = {
	[K in keyof T]: T[K]
} & {}
