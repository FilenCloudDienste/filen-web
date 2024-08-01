import { memo, useCallback } from "react"
import { Flat as FlatCircularProgress } from "@alptugidin/react-circular-progress-bar"
import { useTransfersStore } from "@/stores/transfers.store"

export const TransfersProgress = memo(() => {
	const progress = useTransfersStore(useCallback(state => state.progress, []))

	if (progress <= 0) {
		return null
	}

	return (
		<div className="absolute w-[44px] h-[44px] text-blue-500">
			<FlatCircularProgress
				progress={progress}
				showValue={false}
				sx={{
					strokeColor: "rgb(59 130 246 / var(--tw-text-opacity))",
					barWidth: 8,
					bgStrokeColor: "transparent",
					bgColor: { value: "#000000", transparency: "10" },
					shape: "full",
					strokeLinecap: "square",
					loadingTime: 0,
					miniCircleSize: 0,
					intersectionEnabled: true
				}}
			/>
		</div>
	)
})

export default TransfersProgress
