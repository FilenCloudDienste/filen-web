import { memo, useMemo } from "react"
import useDriveURLState from "@/hooks/useDriveURLState"
import { ColoredFolderSVGIcon } from "@/assets/fileExtensionIcons"
import { useTranslation } from "react-i18next"
import useCanUpload from "@/hooks/useCanUpload"
import { Button } from "@/components/ui/button"
import { Upload, PhoneIncoming, PhoneOutgoing, Link, Heart, Timer, Trash } from "lucide-react"

export const Empty = memo(() => {
	const urlState = useDriveURLState()
	const { t } = useTranslation()
	const canUpload = useCanUpload()

	const state = useMemo(() => {
		if (canUpload) {
			return {
				icon: (
					<ColoredFolderSVGIcon
						width={128}
						height={128}
					/>
				),
				title: t("drive.emptyPlaceholder.drive.title"),
				info: t("drive.emptyPlaceholder.drive.info"),
				uploadButton: true
			}
		}

		if (urlState.trash) {
			return {
				icon: (
					<Trash
						width={128}
						height={128}
						className="text-muted-foreground"
					/>
				),
				title: t("drive.emptyPlaceholder.trash.title"),
				info: t("drive.emptyPlaceholder.trash.info"),
				uploadButton: false
			}
		}

		if (urlState.recents) {
			return {
				icon: (
					<Timer
						width={128}
						height={128}
						className="text-muted-foreground"
					/>
				),
				title: t("drive.emptyPlaceholder.recents.title"),
				info: t("drive.emptyPlaceholder.recents.info"),
				uploadButton: false
			}
		}

		if (urlState.links) {
			return {
				icon: (
					<Link
						width={128}
						height={128}
						className="text-muted-foreground"
					/>
				),
				title: t("drive.emptyPlaceholder.links.title"),
				info: t("drive.emptyPlaceholder.links.info"),
				uploadButton: false
			}
		}

		if (urlState.favorites) {
			return {
				icon: (
					<Heart
						width={128}
						height={128}
						className="text-muted-foreground"
					/>
				),
				title: t("drive.emptyPlaceholder.favorites.title"),
				info: t("drive.emptyPlaceholder.favorites.info"),
				uploadButton: false
			}
		}

		if (urlState.sharedIn) {
			return {
				icon: (
					<PhoneIncoming
						width={128}
						height={128}
						className="text-muted-foreground"
					/>
				),
				title: t("drive.emptyPlaceholder.sharedIn.title"),
				info: t("drive.emptyPlaceholder.sharedIn.info"),
				uploadButton: false
			}
		}

		if (urlState.sharedOut) {
			return {
				icon: (
					<PhoneOutgoing
						width={128}
						height={128}
						className="text-muted-foreground"
					/>
				),
				title: t("drive.emptyPlaceholder.sharedOut.title"),
				info: t("drive.emptyPlaceholder.sharedOut.info"),
				uploadButton: false
			}
		}

		return {
			icon: (
				<ColoredFolderSVGIcon
					width={128}
					height={128}
				/>
			),
			title: t("drive.emptyPlaceholder.drive.title"),
			info: t("drive.emptyPlaceholder.drive.info"),
			uploadButton: true
		}
	}, [canUpload, urlState, t])

	return (
		<div className="flex flex-row items-center justify-center w-full h-full">
			<div className="flex flex-col p-4 justify-center items-center">
				{state.icon}
				<p className="text-xl text-center mt-4">{state.title}</p>
				<p className="text-muted-foreground text-center">{state.info}</p>
				{state.uploadButton && (
					<Button
						variant="secondary"
						className="items-center gap-2 mt-4"
						onClick={() => document.getElementById("file-input")?.click()}
					>
						<Upload size={16} />
						{t("drive.emptyPlaceholder.uploadFiles")}
					</Button>
				)}
			</div>
		</div>
	)
})

export default Empty
