import { memo, useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import eventEmitter from "@/lib/eventEmitter"
import TextEditor from "@/components/textEditor"
import useWindowSize from "@/hooks/useWindowSize"
import { X, Loader } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import useErrorToast from "@/hooks/useErrorToast"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import { v4 as uuidv4 } from "uuid"

export const Editor = memo(
	({
		syncUUID,
		content,
		setContent,
		setDidChange
	}: {
		syncUUID: string
		content: string
		setContent: React.Dispatch<React.SetStateAction<string>>
		setDidChange: React.Dispatch<React.SetStateAction<boolean>>
	}) => {
		const windowSize = useWindowSize()
		const dataUpdatedAtRef = useRef<number>(-1)

		const query = useQuery({
			queryKey: ["syncFetchIgnorerContent", syncUUID],
			queryFn: () => window.desktopAPI.syncFetchIgnorerContent({ uuid: syncUUID })
		})

		const editorHeight = useMemo(() => {
			return windowSize.height - 49
		}, [windowSize.height])

		useEffect(() => {
			if (query.isSuccess && query.dataUpdatedAt !== dataUpdatedAtRef.current) {
				dataUpdatedAtRef.current = query.dataUpdatedAt

				setContent(query.data)
			}
		}, [query.isSuccess, query.dataUpdatedAt, query.data, setContent])

		if (!query.isSuccess) {
			return null
		}

		return (
			<TextEditor
				value={content}
				type="code"
				setValue={setContent}
				onValueChange={() => setDidChange(true)}
				fileName=".gitignore"
				height={editorHeight}
			/>
		)
	}
)

export const FilenIgnoreDialog = memo(() => {
	const [open, setOpen] = useState<boolean>(false)
	const [syncUUID, setSyncUUID] = useState<string>("")
	const [content, setContent] = useState<string>("")
	const lastContentRef = useRef<string>(uuidv4())
	const errorToast = useErrorToast()
	const [didChange, setDidChange] = useState<boolean>(false)
	const { t } = useTranslation()
	const [saving, setSaving] = useState<boolean>(false)

	const onOpenChange = useCallback((openState: boolean) => {
		setOpen(openState)
	}, [])

	const updateContent = useCallback(async () => {
		if (saving) {
			return
		}

		if (JSON.stringify(content) === JSON.stringify(lastContentRef.current) || syncUUID.length === 0 || !didChange) {
			setDidChange(false)
			setSaving(false)

			return
		}

		lastContentRef.current = content

		setSaving(true)

		try {
			await window.desktopAPI.syncUpdateIgnorerContent({
				uuid: syncUUID,
				content
			})

			await window.desktopAPI.syncResetCache({
				uuid: syncUUID
			})

			setDidChange(false)
		} catch (e) {
			lastContentRef.current = uuidv4()

			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			setSaving(false)
		}
	}, [errorToast, syncUUID, didChange, content, saving])

	const close = useCallback(async () => {
		if (didChange) {
			if (
				!(await showConfirmDialog({
					title: t("previewDialog.unsavedChanges.title"),
					continueButtonText: t("previewDialog.unsavedChanges.continue"),
					description: t("previewDialog.unsavedChanges.description"),
					continueButtonVariant: "destructive"
				}))
			) {
				return
			}
		}

		setOpen(false)
		setDidChange(false)
		setContent("")

		lastContentRef.current = uuidv4()
	}, [didChange, t])

	useEffect(() => {
		const listener = eventEmitter.on("openFilenIgnoreDialog", (uuid: string) => {
			setOpen(true)
			setSyncUUID(uuid)
		})

		return () => {
			listener.remove()
		}
	}, [])

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent
				className="fullscreen-dialog no-close-button outline-none focus:outline-none active:outline-none hover:outline-none"
				onEscapeKeyDown={close}
			>
				<div className="w-screen h-[100dvh] flex flex-col">
					<div
						className="flex flex-row border-b h-[49px] bg-secondary w-full items-center justify-between px-4 z-50 gap-10 -mt-[1px]"
						style={{
							// @ts-expect-error not typed
							WebkitAppRegion: "drag"
						}}
					>
						<p className="line-clamp-1 text-ellipsis break-all">{t("syncs.dialogs.filenIgnore.title")}</p>
						<div
							className="flex flex-row items-center gap-4"
							style={{
								// @ts-expect-error not typed
								WebkitAppRegion: "no-drag"
							}}
						>
							{didChange && (
								<Button
									size="sm"
									className="h-7"
									onClick={updateContent}
									disabled={saving}
								>
									{saving ? (
										<Loader
											className="animate-spin-medium"
											size={16}
										/>
									) : (
										t("syncs.dialogs.filenIgnore.save")
									)}
								</Button>
							)}
							<X
								className="h-4 w-4 opacity-70 hover:opacity-100 cursor-pointer"
								onClick={close}
							/>
						</div>
					</div>
					<div className="flex flex-row">
						<Editor
							syncUUID={syncUUID}
							content={content}
							setContent={setContent}
							setDidChange={setDidChange}
						/>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
})

export default FilenIgnoreDialog
