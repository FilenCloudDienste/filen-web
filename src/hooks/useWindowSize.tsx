import { useWindowSize as useWS } from "@uidotdev/usehooks"

export default function useWindowSize() {
	const ws = useWS()

	return {
		width: ws.width ?? window.innerWidth,
		height: ws.height ?? window.innerHeight
	}
}
