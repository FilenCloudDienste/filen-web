import useAccount from "./useAccount"

export default function useSubscriptions() {
	const account = useAccount()

	return account ? account.account.subs : null
}
