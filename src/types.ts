/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never

export type Prettify<T> = {
	[K in keyof T]: T[K]
} & {}

export type RemoteConfig = {
	maintenance: boolean
	readOnly: boolean
	announcements: RemoteConfigAnnouncement[]
	pricing: RemoteConfigPricing
}

export type RemoteConfigAnnouncement = {
	uuid: string
	title: string
	message: string
	active: boolean
	timestamp: number
	platforms: ("web" | "desktop" | "mobile" | "all")[]
}

export type RemoteConfigPricing = {
	lifetimeEnabled: boolean
	saleEnabled: boolean
	plans: RemoteConfigPlan[]
}

export type RemoteConfigPlan = {
	termType: number
	id: number
	name: string
	cost: number
	sale: number
	storage: number
	popular: boolean
	term: "lifetime" | "annually" | "monthly"
}
