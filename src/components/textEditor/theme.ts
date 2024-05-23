import { githubLightInit, githubDarkInit } from "@uiw/codemirror-theme-github"

export const dark = githubDarkInit({
	settings: {
		background: "transparent",
		gutterBackground: "#151518",
		gutterBorder: "#151518",
		gutterActiveForeground: "white",
		foreground: "white"
	}
})
export const light = githubLightInit({
	settings: {
		background: "transparent",
		gutterBackground: "#FBFBFB",
		gutterBorder: "#FBFBFB",
		gutterActiveForeground: "black",
		foreground: "black"
	}
})
