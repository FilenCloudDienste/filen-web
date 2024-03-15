import { memo, useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useTranslation } from "react-i18next"
import useWindowSize from "@/hooks/useWindowSize"
import eventEmitter from "@/lib/eventEmitter"

export const Transfers = memo(() => {
	const { t } = useTranslation()
	const windowSize = useWindowSize()
	const [open, setOpen] = useState<boolean>(false)

	useEffect(() => {
		const listener = eventEmitter.on("openTransfers", () => {
			setOpen(true)
		})

		return () => {
			listener.remove()
		}
	}, [])

	return (
		<Sheet
			open={open}
			onOpenChange={setOpen}
		>
			<SheetContent onOpenAutoFocus={e => e.preventDefault()}>
				<SheetHeader>
					<SheetTitle className="line-clamp-1 text-ellipsis">{t("transfers.title")}</SheetTitle>
					<div
						className="w-full border"
						style={{
							height: windowSize.height - 85
						}}
					></div>
				</SheetHeader>
			</SheetContent>
		</Sheet>
	)
})

export default Transfers
