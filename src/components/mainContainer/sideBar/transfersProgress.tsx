import { memo } from "react"
import { Flat as FlatCircularProgress } from "@alptugidin/react-circular-progress-bar"
import { useTransfersStore } from "@/stores/transfers.store"

export const TransfersProgress = memo(() => {
	const { progress } = useTransfersStore()

	if (progress <= 0) {
		return null
	}

	return (
		<div className="absolute w-[50px] h-[50px]">
			<FlatCircularProgress
				progress={progress}
				showValue={false}
				sx={{
					strokeColor: "green",
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
