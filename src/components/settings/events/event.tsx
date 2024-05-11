import { memo, useMemo } from "react"
import Avatar from "@/components/avatar"
import { simpleDate } from "@/utils"
import { UserEvent } from "@filen/sdk/dist/types/api/v3/user/events"
import { type UserAccountResponse } from "@filen/sdk/dist/types/api/v3/user/account"
import { useTranslation } from "react-i18next"
import { fileNameToSVGIcon, ColoredFolderSVGIcon } from "@/assets/fileExtensionIcons"

export const Event = memo(({ event, account }: { event: UserEvent; account: UserAccountResponse }) => {
	const { t } = useTranslation()

	const eventText = useMemo(() => {
		try {
			switch (event.type) {
				case "fileUploaded": {
					return t("settings.events.fileUploaded", { name: event.info.metadataDecrypted.name })
				}

				case "fileVersioned": {
					return t("settings.events.fileVersioned", { name: event.info.metadataDecrypted.name })
				}

				case "versionedFileRestored": {
					return t("settings.events.versionedFileRestored", { name: event.info.metadataDecrypted.name })
				}

				case "fileMoved": {
					return t("settings.events.fileMoved", { name: event.info.metadataDecrypted.name })
				}

				case "fileRenamed": {
					return t("settings.events.fileRenamed", {
						name: event.info.oldMetadataDecrypted.name,
						newName: event.info.metadataDecrypted.name
					})
				}

				case "fileTrash": {
					return t("settings.events.fileTrash", { name: event.info.metadataDecrypted.name })
				}

				case "fileRm": {
					return t("settings.events.fileRm", { name: event.info.metadataDecrypted.name })
				}

				case "fileRestored": {
					return t("settings.events.fileRestored", { name: event.info.metadataDecrypted.name })
				}

				case "fileShared": {
					return t("settings.events.fileShared", { name: event.info.metadataDecrypted.name, email: event.info.receiverEmail })
				}

				case "fileLinkEdited": {
					return t("settings.events.fileLinkEdited", { name: event.info.metadataDecrypted.name })
				}

				case "folderTrash": {
					return t("settings.events.folderTrash", { name: event.info.nameDecrypted.name })
				}

				case "folderShared": {
					return t("settings.events.folderShared", {
						name: event.info.nameDecrypted.name,
						email: event.info.receiverEmail
					})
				}

				case "folderMoved": {
					return t("settings.events.folderMoved", { name: event.info.nameDecrypted.name })
				}

				case "folderRenamed": {
					return t("settings.events.folderRenamed", {
						name: event.info.oldNameDecrypted.name,
						newName: event.info.nameDecrypted.name
					})
				}

				case "subFolderCreated": {
					return t("settings.events.subFolderCreated", { name: event.info.nameDecrypted.name })
				}

				case "baseFolderCreated": {
					return t("settings.events.baseFolderCreated", { name: event.info.nameDecrypted.name })
				}

				case "folderRestored": {
					return t("settings.events.folderRestored", { name: event.info.nameDecrypted.name })
				}

				case "folderColorChanged": {
					return t("settings.events.folderColorChanged", { name: event.info.nameDecrypted.name })
				}

				case "login": {
					return t("settings.events.login")
				}

				case "deleteVersioned": {
					return t("settings.events.deleteVersioned")
				}

				case "deleteAll": {
					return t("settings.events.deleteAll")
				}

				case "deleteUnfinished": {
					return t("settings.events.deleteUnfinished")
				}

				case "trashEmptied": {
					return t("settings.events.trashEmptied")
				}

				case "requestAccountDeletion": {
					return t("settings.events.requestAccountDeletion")
				}

				case "2faEnabled": {
					return t("settings.events.2faEnabled")
				}

				case "2faDisabled": {
					return t("settings.events.2faDisabled")
				}

				case "codeRedeemed": {
					return t("settings.events.codeRedeemed", { code: event.info.code })
				}

				case "emailChanged": {
					return t("settings.events.emailChanged", { email: event.info.email })
				}

				case "passwordChanged": {
					return t("settings.events.passwordChanged")
				}

				case "removedSharedInItems": {
					return t("settings.events.removedSharedInItems", {
						count: event.info.count,
						email: event.info.sharerEmail
					})
				}

				case "removedSharedOutItems": {
					return t("settings.events.removedSharedInItems", {
						count: event.info.count,
						email: event.info.receiverEmail
					})
				}

				case "folderLinkEdited": {
					return t("settings.events.folderLinkEdited")
				}

				case "itemFavorite": {
					return t(event.info.value === 1 ? "settings.events.itemFavoriteAdded" : "settings.events.itemFavoriteRemoved", {
						name: event.info.metadataDecrypted ? event.info.metadataDecrypted.name : event.info.nameDecrypted?.name
					})
				}

				case "failedLogin": {
					return t("settings.events.failedLogin")
				}

				case "deleteFolderPermanently": {
					return t("settings.events.deleteFolderPermanently", { name: event.info.nameDecrypted?.name })
				}

				case "deleteFilePermanently": {
					return t("settings.events.deleteFolderPermanently", { name: event.info.metadataDecrypted.name })
				}

				case "emailChangeAttempt": {
					return t("settings.events.emailChangeAttempt")
				}

				default: {
					return (event as UserEvent).type
				}
			}
		} catch (e) {
			console.error(e)

			return event.type
		}
	}, [event, t])

	return (
		<div className="flex flex-row p-4 w-full">
			<div className="flex flex-row border-b items-center justify-between px-4 py-3 gap-10 cursor-pointer hover:bg-secondary hover:rounded-md w-full">
				<div className="flex flex-row gap-3 items-center">
					{event.type === "folderColorChanged" ||
					event.type === "folderLinkEdited" ||
					event.type === "baseFolderCreated" ||
					event.type === "folderMoved" ||
					event.type === "folderRenamed" ||
					event.type === "folderRestored" ||
					event.type === "folderShared" ||
					event.type === "folderTrash" ||
					event.type === "subFolderCreated" ||
					event.type === "deleteFolderPermanently" ? (
						<ColoredFolderSVGIcon
							width={24}
							height={24}
						/>
					) : event.type === "fileLinkEdited" ||
					  event.type === "fileMoved" ||
					  event.type === "fileRenamed" ||
					  event.type === "fileRestored" ||
					  event.type === "fileRm" ||
					  event.type === "fileShared" ||
					  event.type === "fileTrash" ||
					  event.type === "fileUploaded" ||
					  event.type === "fileVersioned" ||
					  event.type === "deleteFilePermanently" ? (
						<img
							src={fileNameToSVGIcon(event.info.metadataDecrypted.name)}
							className="w-[24px] h-[24px]"
						/>
					) : event.type === "itemFavorite" ? (
						event.info.metadataDecrypted ? (
							<img
								src={fileNameToSVGIcon(event.info.metadataDecrypted.name)}
								className="w-[24px] h-[24px]"
							/>
						) : (
							<ColoredFolderSVGIcon
								width={24}
								height={24}
							/>
						)
					) : (
						<Avatar
							src={account.avatarURL}
							size={24}
						/>
					)}
					<p className="line-clamp-1 text-ellipsis break-all">{eventText}</p>
				</div>
				<p className="text-muted-foreground text-sm shrink-0">{simpleDate(event.timestamp)}</p>
			</div>
		</div>
	)
})

export default Event
