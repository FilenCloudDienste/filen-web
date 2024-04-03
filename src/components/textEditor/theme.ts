import { githubLightInit, githubDarkInit } from "@uiw/codemirror-theme-github"

export const dark = githubDarkInit({
	settings: {
		background: "transparent",
		gutterBackground: "transparent",
		gutterBorder: "transparent",
		gutterActiveForeground: "white",
		foreground: "white",
		lineHighlight: "#171717"
	}
})

export const light = githubLightInit({
	settings: {
		background: "transparent",
		gutterBackground: "transparent",
		gutterBorder: "transparent",
		gutterActiveForeground: "black",
		foreground: "black"
	}
})
