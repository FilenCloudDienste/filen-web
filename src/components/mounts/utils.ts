import { VALID_LOCAL_PORT_RANGE } from "@/constants"

export function isPortValidLocally(port: number): boolean {
	return port >= (VALID_LOCAL_PORT_RANGE[0] ?? 0) && port <= (VALID_LOCAL_PORT_RANGE[1] ?? 0)
}

export function isValidIPv4(ip: string): boolean {
	const ipv4Pattern = /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}$/

	return ipv4Pattern.test(ip)
}
