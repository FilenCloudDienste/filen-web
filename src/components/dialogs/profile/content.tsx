import { memo, useMemo, useState, useCallback } from "react"
import { useQueries } from "@tanstack/react-query"
import worker from "@/lib/worker"
import { Loader, UserPlus, UserMinus, ShieldOff, ShieldCheck } from "lucide-react"
import Avatar from "@/components/avatar"
import { useTranslation } from "react-i18next"
import { simpleDate } from "@/utils"
import { Button } from "@/components/ui/button"
import useSDKConfig from "@/hooks/useSDKConfig"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import { showConfirmDialog } from "../confirm"

export const Content = memo(({ userId }: { userId: number }) => {
	const { t } = useTranslation()
	const { userId: myUserId } = useSDKConfig()
	const [changing, setChanging] = useState<boolean>(false)
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()

	const [allContactsQuery, requestsInQuery, requestsOutQuery, blockedQuery, profileQuery] = useQueries({
		queries: [
			{
				queryKey: ["listContacts"],
				queryFn: () => worker.listContacts()
			},
			{
				queryKey: ["listContactsRequestsIn"],
				queryFn: () => worker.listContactsRequestsIn()
			},
			{
				queryKey: ["listContactsRequestsOut"],
				queryFn: () => worker.listContactsRequestsOut()
			},
			{
				queryKey: ["listBlockedContacts"],
				queryFn: () => worker.listBlockedContacts()
			},
			{
				queryKey: ["userProfile", userId],
				queryFn: () => worker.userProfile({ id: userId })
			}
		]
	})

	const refetch = useCallback(async () => {
		try {
			await Promise.all([allContactsQuery.refetch(), requestsInQuery.refetch(), requestsOutQuery.refetch(), blockedQuery.refetch()])
		} catch (e) {
			console.error(e)
		}
	}, [allContactsQuery, requestsInQuery, requestsOutQuery, blockedQuery])

	const canAdd = useMemo(() => {
		if (
			!allContactsQuery.isSuccess ||
			!requestsInQuery.isSuccess ||
			!requestsOutQuery.isSuccess ||
			!blockedQuery.isSuccess ||
			myUserId === userId ||
			allContactsQuery.data.some(contact => contact.userId === userId) ||
			requestsInQuery.data.some(request => request.userId === userId) ||
			requestsOutQuery.data.some(request => request.userId === userId) ||
			blockedQuery.data.some(blocked => blocked.userId === userId)
		) {
			return false
		}

		return true
	}, [
		userId,
		myUserId,
		allContactsQuery.isSuccess,
		allContactsQuery.data,
		requestsInQuery.isSuccess,
		requestsInQuery.data,
		requestsOutQuery.isSuccess,
		requestsOutQuery.data,
		blockedQuery.isSuccess,
		blockedQuery.data
	])

	const canRemove = useMemo(() => {
		if (
			!allContactsQuery.isSuccess ||
			!requestsInQuery.isSuccess ||
			!requestsOutQuery.isSuccess ||
			!blockedQuery.isSuccess ||
			myUserId === userId ||
			!allContactsQuery.data.some(contact => contact.userId === userId) ||
			requestsInQuery.data.some(request => request.userId === userId) ||
			requestsOutQuery.data.some(request => request.userId === userId) ||
			blockedQuery.data.some(blocked => blocked.userId === userId)
		) {
			return false
		}

		return true
	}, [
		userId,
		myUserId,
		allContactsQuery.isSuccess,
		allContactsQuery.data,
		requestsInQuery.isSuccess,
		requestsInQuery.data,
		requestsOutQuery.isSuccess,
		requestsOutQuery.data,
		blockedQuery.isSuccess,
		blockedQuery.data
	])

	const canBlock = useMemo(() => {
		if (!blockedQuery.isSuccess || myUserId === userId || blockedQuery.data.some(blocked => blocked.userId === userId)) {
			return false
		}

		return true
	}, [userId, myUserId, blockedQuery.isSuccess, blockedQuery.data])

	const canUnblock = useMemo(() => {
		if (!blockedQuery.isSuccess || myUserId === userId || !blockedQuery.data.some(blocked => blocked.userId === userId)) {
			return false
		}

		return true
	}, [userId, myUserId, blockedQuery.isSuccess, blockedQuery.data])

	const sendRequest = useCallback(async () => {
		if (!profileQuery.isSuccess || !canAdd || changing) {
			return
		}

		setChanging(true)

		const toast = loadingToast()

		try {
			await worker.contactsRequestSend({ email: profileQuery.data.email })
			await refetch()
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()

			setChanging(false)
		}
	}, [refetch, errorToast, loadingToast, canAdd, profileQuery.isSuccess, profileQuery.data, changing])

	const block = useCallback(async () => {
		if (!profileQuery.isSuccess || !canBlock || changing) {
			return
		}

		if (
			!(await showConfirmDialog({
				title: t("contacts.dialogs.block.title"),
				continueButtonText: t("contacts.dialogs.block.continue"),
				description: t("contacts.dialogs.block.description", {
					name: profileQuery.data.nickName.length > 0 ? profileQuery.data.nickName : profileQuery.data.email
				}),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		setChanging(true)

		const toast = loadingToast()

		try {
			await worker.blockUser({ email: profileQuery.data.email })
			await refetch()
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()

			setChanging(false)
		}
	}, [refetch, errorToast, loadingToast, canBlock, profileQuery.isSuccess, profileQuery.data, changing, t])

	const unblock = useCallback(async () => {
		if (!canUnblock || !blockedQuery.isSuccess || changing || !profileQuery.isSuccess) {
			return
		}

		const blocked = blockedQuery.data.filter(block => block.userId === userId)
		const block = blocked[0]

		if (!block) {
			return
		}

		if (
			!(await showConfirmDialog({
				title: t("contacts.dialogs.unblock.title"),
				continueButtonText: t("contacts.dialogs.unblock.continue"),
				description: t("contacts.dialogs.unblock.description", {
					name: profileQuery.data.nickName.length > 0 ? profileQuery.data.nickName : profileQuery.data.email
				}),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		setChanging(true)

		const toast = loadingToast()

		try {
			await worker.unblockUser({ uuid: block.uuid })
			await refetch()
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()

			setChanging(false)
		}
	}, [
		refetch,
		errorToast,
		loadingToast,
		canUnblock,
		userId,
		blockedQuery.isSuccess,
		blockedQuery.data,
		changing,
		profileQuery.isSuccess,
		profileQuery.data,
		t
	])

	const remove = useCallback(async () => {
		if (!canRemove || !allContactsQuery.isSuccess || changing) {
			return
		}

		const contacts = allContactsQuery.data.filter(contact => contact.userId === userId)
		const contact = contacts[0]

		if (!contact) {
			return
		}

		if (
			!(await showConfirmDialog({
				title: t("contacts.dialogs.remove.title"),
				continueButtonText: t("contacts.dialogs.remove.continue"),
				description: t("contacts.dialogs.remove.description", {
					name: contact.nickName.length > 0 ? contact.nickName : contact.email
				}),
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		setChanging(true)

		const toast = loadingToast()

		try {
			await worker.removeContact({ uuid: contact.uuid })
			await refetch()
		} catch (e) {
			console.error(e)

			errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())
		} finally {
			toast.dismiss()

			setChanging(false)
		}
	}, [refetch, errorToast, loadingToast, canRemove, allContactsQuery.isSuccess, allContactsQuery.data, userId, changing, t])

	return (
		<div className="flex flex-col w-full h-auto">
			{!profileQuery.isSuccess ||
			!allContactsQuery.isSuccess ||
			!requestsInQuery.isSuccess ||
			!requestsOutQuery.isSuccess ||
			!blockedQuery.isSuccess ? (
				<div className="flex flex-row items-center justify-center">
					<Loader className="animate-spin-medium" />
				</div>
			) : (
				<>
					<div className="flex flex-row gap-3 items-center">
						<Avatar
							src={profileQuery.data.avatar}
							size={50}
						/>
						<div className="flex flex-col">
							<p className="text-xl line-clamp-1 text-ellipsis break-all">
								{profileQuery.data.nickName.length > 0 ? profileQuery.data.nickName : profileQuery.data.email}
							</p>
							<p className="text-muted-foreground line-clamp-1 text-ellipsis break-all">
								{profileQuery.data.nickName.length > 0 ? profileQuery.data.nickName : profileQuery.data.email}
							</p>
						</div>
					</div>
					<div className="w-full h-[1px] bg-border mt-4" />
					<p className="text-muted-foreground line-clamp-1 text-ellipsis break-all text-sm mt-1.5">
						{t("dialogs.profile.memberSince", { since: simpleDate(profileQuery.data.createdAt) })}
					</p>
					{(canAdd || canRemove || canBlock || canUnblock) && (
						<div className="flex flex-row mt-6 gap-2">
							{canAdd && (
								<Button
									onClick={sendRequest}
									disabled={changing}
									size="sm"
									className="items-center gap-2"
								>
									<UserPlus size={15} />
									{t("dialogs.profile.add")}
								</Button>
							)}
							{canRemove && (
								<Button
									variant="destructive"
									onClick={remove}
									disabled={changing}
									size="sm"
									className="items-center gap-2"
								>
									<UserMinus size={15} />
									{t("dialogs.profile.remove")}
								</Button>
							)}
							{canBlock && (
								<Button
									variant="destructive"
									onClick={block}
									disabled={changing}
									size="sm"
									className="items-center gap-2"
								>
									<ShieldOff size={15} />
									{t("dialogs.profile.block")}
								</Button>
							)}
							{canUnblock && (
								<Button
									onClick={unblock}
									disabled={changing}
									size="sm"
									className="items-center gap-2"
								>
									<ShieldCheck size={15} />
									{t("dialogs.profile.unblock")}
								</Button>
							)}
						</div>
					)}
				</>
			)}
		</div>
	)
})

export default Content
