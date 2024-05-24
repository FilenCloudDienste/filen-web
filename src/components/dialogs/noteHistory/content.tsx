import { memo, useMemo, useCallback, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import worker from "@/lib/worker"
import { type Note } from "@filen/sdk/dist/types/api/v3/notes"
import RichTextEditor from "@/components/textEditor/rich"
import TextEditor from "@/components/textEditor"
import useWindowSize from "@/hooks/useWindowSize"
import { Virtuoso } from "react-virtuoso"
import { type NoteHistory } from "@filen/sdk/dist/types/api/v3/notes/history"
import { simpleDate, convertTimestampToMs } from "@/utils"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Text, ListChecks, Code, NotepadText, BookMarked, Loader } from "lucide-react"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { useTranslation } from "react-i18next"

export const Content = memo(({ note, setOpen }: { note: Note; setOpen: React.Dispatch<React.SetStateAction<boolean>> }) => {
	const windowSize = useWindowSize()
	const [selectedHistory, setSelectedHistory] = useState<NoteHistory | null>(null)
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const [restoring, setRestoring] = useState<boolean>(false)
	const { t } = useTranslation()

	const query = useQuery({
		queryKey: ["noteHistory", note.uuid],
		queryFn: () => worker.noteHistory({ uuid: note.uuid })
	})

	const historySorted = useMemo(() => {
		if (!query.isSuccess) {
			return []
		}

		return query.data.sort((a, b) => b.editedTimestamp - a.editedTimestamp)
	}, [query.isSuccess, query.data])

	const close = useCallback(() => {
		setOpen(false)
	}, [setOpen])

	const getItemKey = useCallback((_: number, history: NoteHistory) => history.id, [])

	const itemContent = useCallback(
		(_: number, history: NoteHistory) => {
			return (
				<div className="flex flex-row p-4 py-1 w-full">
					<div
						className={cn(
							"flex flex-row items-center hover:bg-secondary p-2 w-full rounded-md cursor-pointer gap-2",
							selectedHistory && selectedHistory.id === history.id && "bg-secondary"
						)}
						onClick={() => setSelectedHistory(history)}
					>
						{history.type === "checklist" && (
							<ListChecks
								className="text-purple-500 shrink-0"
								size={20}
							/>
						)}
						{history.type === "text" && (
							<Text
								className="text-blue-500 shrink-0"
								size={20}
							/>
						)}
						{history.type === "code" && (
							<Code
								className="text-red-500 shrink-0"
								size={20}
							/>
						)}
						{history.type === "rich" && (
							<NotepadText
								className="text-cyan-500 shrink-0"
								size={20}
							/>
						)}
						{history.type === "md" && (
							<BookMarked
								className="text-indigo-500 shrink-0"
								size={20}
							/>
						)}
						<p className="line-clamp-1 text-ellipsis break-all">{simpleDate(convertTimestampToMs(history.editedTimestamp))}</p>
					</div>
				</div>
			)
		},
		[selectedHistory]
	)

	const noop = useCallback(() => {}, [])

	const restore = useCallback(async () => {
		if (!selectedHistory || restoring) {
			return
		}

		setRestoring(true)

		const toast = loadingToast()

		try {
			await worker.restoreNoteHistory({
				uuid: note.uuid,
				id: selectedHistory.id
			})

			setOpen(false)
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()

			setRestoring(false)
		}
	}, [loadingToast, errorToast, note.uuid, selectedHistory, setOpen, restoring])

	useEffect(() => {
		if (selectedHistory || historySorted.length === 0 || !historySorted[0]) {
			return
		}

		setSelectedHistory(historySorted[0])
	}, [historySorted, selectedHistory])

	if (!query.isSuccess) {
		return (
			<div className="flex flex-col w-full h-[calc(100vh-48px)] items-center justify-center">
				<Loader className="animate-spin-medium" />
			</div>
		)
	}

	if (query.isSuccess && historySorted.length === 0) {
		return (
			<div className="flex flex-col w-full h-[calc(100vh-48px)] items-center justify-center">
				<p className="text-muted-foreground">{t("dialogs.noteHistory.empty")}</p>
			</div>
		)
	}

	return (
		<div className="flex flex-col w-full h-[calc(100vh-48px)]">
			<div className="flex flex-row">
				<div className="flex flex-col w-[300px] border-r h-full">
					<Virtuoso
						data={historySorted}
						totalCount={historySorted.length}
						height={windowSize.height - 48}
						width="100%"
						computeItemKey={getItemKey}
						itemContent={itemContent}
						style={{
							overflowX: "hidden",
							overflowY: "auto",
							height: windowSize.height - 48 + "px",
							width: "100%"
						}}
					/>
				</div>
				<div className="flex flex-col grow w-[calc(100vw-300px)] h-full">
					{selectedHistory && (
						<>
							{selectedHistory.type === "rich" || selectedHistory.type === "checklist" ? (
								<RichTextEditor
									key={selectedHistory.id + ":" + selectedHistory.type}
									value={selectedHistory.content}
									setValue={noop}
									onValueChange={noop}
									width={windowSize.width - 300}
									height={windowSize.height - 48 - 12 - (selectedHistory.type === "rich" ? 9 : 0)}
									type={selectedHistory.type}
									readOnly={true}
								/>
							) : (
								<TextEditor
									key={selectedHistory.id + ":" + selectedHistory.type}
									fileName={selectedHistory.type === "md" ? "note.md" : note.title}
									value={selectedHistory.content}
									setValue={noop}
									onValueChange={noop}
									height={windowSize.height - 48 - 56}
									type={selectedHistory.type === "md" || selectedHistory.type === "code" ? "code" : "text"}
									readOnly={true}
									showMarkdownPreview={selectedHistory.type === "md"}
								/>
							)}
							<div className="flex flex-row border-t justify-end items-center px-4 h-14 gap-2">
								<Button
									size="sm"
									variant="outline"
									onClick={close}
								>
									Close
								</Button>
								<Button
									size="sm"
									disabled={!selectedHistory || restoring}
									onClick={restore}
									className="gap-2"
								>
									{restoring && (
										<Loader
											size={16}
											className="animate-spin-medium"
										/>
									)}
									Restore
								</Button>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	)
})

export default Content
