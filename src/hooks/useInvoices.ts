import useAccount from "./useAccount"

export default function useInvoices() {
	const account = useAccount()

	return account ? account.account.subsInvoices : null
}
