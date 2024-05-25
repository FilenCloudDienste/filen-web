import { memo, useMemo } from "react"
import useDriveURLState from "@/hooks/useDriveURLState"
import { ColoredFolderSVGIcon } from "@/assets/fileExtensionIcons"
import { useTranslation } from "react-i18next"
import useCanUpload from "@/hooks/useCanUpload"
import { Button } from "@/components/ui/button"
import { Upload, PhoneIncoming, PhoneOutgoing, Link, Heart, Timer, Trash, Search } from "lucide-react"
import { usePublicLinkURLState } from "@/hooks/usePublicLink"
import { useDriveItemsStore } from "@/stores/drive.store"
import { useDirectoryPublicLinkStore } from "@/stores/publicLink.store"

export const Empty = memo(() => {
	const urlState = useDriveURLState()
	const { t } = useTranslation()
	const canUpload = useCanUpload()
	const { searchTerm } = useDriveItemsStore()
	const publicLinkURLState = usePublicLinkURLState()
	const { searchTerm: publicLinkSearchTerm } = useDirectoryPublicLinkStore()

	const state = useMemo(() => {
		if (searchTerm.length > 0 || publicLinkSearchTerm.length > 0) {
			return {
				icon: (
					<Search
						width={128}
						height={128}
						className="text-muted-foreground"
					/>
				),
				title: t("drive.emptyPlaceholder.search.title"),
				info: t("drive.emptyPlaceholder.search.info"),
				uploadButton: canUpload
			}
		}

		if (publicLinkURLState.isPublicLink) {
			return {
				icon: (
					<ColoredFolderSVGIcon
						width={128}
						height={128}
					/>
				),
				title: t("drive.emptyPlaceholder.publicLink.title"),
				info: t("drive.emptyPlaceholder.publicLink.info"),
				uploadButton: canUpload
			}
		}

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
				uploadButton: canUpload
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
				uploadButton: canUpload
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
				uploadButton: canUpload
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
				uploadButton: canUpload
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
				uploadButton: canUpload
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
				uploadButton: canUpload
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
				uploadButton: canUpload
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
			uploadButton: canUpload
		}
	}, [canUpload, urlState, t, searchTerm, publicLinkURLState.isPublicLink, publicLinkSearchTerm])

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
