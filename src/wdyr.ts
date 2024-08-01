import * as React from "react"

if (import.meta.env.DEV) {
	const { default: wdyr } = await import("@welldone-software/why-did-you-render")

	wdyr(React, {
		include: [/^Transfers/, /^Transfer/],
		exclude: [],
		trackHooks: true,
		trackAllPureComponents: true
	})
}
