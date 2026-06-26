import { useMemo } from "react"
import useIsMobile from "./useIsMobile"

/**
 * Fixed pixel widths for the drive list's trailing columns (size / modified / more). The leading "name" column is NOT sized
 * here — it fills the remaining space via flexbox (`flex-1 min-w-0`) in the row and headers, which truncates reliably across
 * Chromium versions. (Previously the name width was derived by measuring the list container with `useElementDimensions`,
 * which raced under newer Chromium and collapsed some rows' names to a single character + ellipsis.)
 */
export default function useDriveListColumnSize() {
	const isMobile = useIsMobile()

	const sizes = useMemo(() => {
		return {
			size: isMobile ? 50 : 100,
			modified: isMobile ? 100 : 250,
			more: isMobile ? 0 : 30
		}
	}, [isMobile])

	return sizes
}
