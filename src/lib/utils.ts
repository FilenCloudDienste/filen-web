/* eslint-disable quotes */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * Chunk large Promise.all executions.
 * @date 2/14/2024 - 11:59:34 PM
 *
 * @export
 * @async
 * @template T
 * @param {Promise<T>[]} promises
 * @param {number} [chunkSize=10000]
 * @returns {Promise<T[]>}
 */
export async function promiseAllChunked<T>(promises: Promise<T>[], chunkSize = 100000): Promise<T[]> {
	const results: T[] = []

	for (let i = 0; i < promises.length; i += chunkSize) {
		const chunkResults = await Promise.all(promises.slice(i, i + chunkSize))

		results.push(...chunkResults)
	}

	return results
}

/**
 * Chunk large Promise.allSettled executions.
 * @date 3/5/2024 - 12:41:08 PM
 *
 * @export
 * @async
 * @template T
 * @param {Promise<T>[]} promises
 * @param {number} [chunkSize=100000]
 * @returns {Promise<T[]>}
 */
export async function promiseAllSettledChunked<T>(promises: Promise<T>[], chunkSize = 100000): Promise<T[]> {
	const results: T[] = []

	for (let i = 0; i < promises.length; i += chunkSize) {
		const chunkPromisesSettled = await Promise.allSettled(promises.slice(i, i + chunkSize))
		const chunkResults = chunkPromisesSettled.reduce((acc: T[], current) => {
			if (current.status === "fulfilled") {
				acc.push(current.value)
			} else {
				// Handle rejected promises or do something with the error (current.reason)
			}

			return acc
		}, [])

		results.push(...chunkResults)
	}

	return results
}

/**
 * Find the closest starting index of a substring inside another string.
 *
 * @export
 * @param {string} sourceString
 * @param {string} targetString
 * @param {number} givenIndex
 * @returns {number}
 */
export function findClosestIndex(sourceString: string, targetString: string, givenIndex: number): number {
	const extractedSubstring = sourceString.slice(0, givenIndex + 1)
	const lastIndexWithinExtracted = extractedSubstring.lastIndexOf(targetString)

	if (lastIndexWithinExtracted !== -1) {
		return lastIndexWithinExtracted
	}

	for (let offset = 1; offset <= givenIndex; offset++) {
		const substringBefore = sourceString.slice(givenIndex - offset, givenIndex + 1)
		const lastIndexBefore = substringBefore.lastIndexOf(targetString)

		if (lastIndexBefore !== -1) {
			return givenIndex - offset + lastIndexBefore
		}
	}

	return -1
}

export function parseURLSearchParams(url: string): Record<string, string> {
	const urlObj = new URL(url)
	const params = new URLSearchParams(urlObj.search)
	const paramMap: Record<string, string> = {}

	params.forEach((value, key) => {
		paramMap[key] = value
	})

	return paramMap
}

/**
 * Returns true if one or more dialogs are open.
 *
 * @export
 * @returns {boolean}
 */
export function dialogsOpen(): boolean {
	const alerts = document.querySelectorAll('div[role="alertdialog"]')
	const dialogs = document.querySelectorAll('div[role="dialog"]')

	return alerts.length > 0 || dialogs.length > 0
}

/**
 * Converts pixel values to percentage based on the container width.
 * @param {number} pixelValue - The value in pixels to be converted.
 * @param {number} containerWidth - The total width of the container in pixels.
 * @returns {number} - The value converted to a percentage.
 */
export function pixelsToPercentage(pixelValue: number, containerWidth: number): number {
	return (pixelValue / containerWidth) * 100
}

/**
 * Converts percentage values to pixels based on the container width.
 * @param {number} percentageValue - The value in percentage to be converted.
 * @param {number} containerWidth - The total width of the container in pixels.
 * @returns {number} - The value converted to pixels.
 */
export function percentageToPixels(percentageValue: number, containerWidth: number): number {
	return (percentageValue / 100) * containerWidth
}

export function isValidFileName(fileName: string): boolean {
	// eslint-disable-next-line no-control-regex
	const invalidChars = /[<>:"/\\|?*\x00-\x1F]/
	const reservedWindowsNames = [
		"CON",
		"PRN",
		"AUX",
		"NUL",
		"COM1",
		"COM2",
		"COM3",
		"COM4",
		"COM5",
		"COM6",
		"COM7",
		"COM8",
		"COM9",
		"LPT1",
		"LPT2",
		"LPT3",
		"LPT4",
		"LPT5",
		"LPT6",
		"LPT7",
		"LPT8",
		"LPT9"
	]

	if (invalidChars.test(fileName)) {
		return false
	}

	if (reservedWindowsNames.includes(fileName.toUpperCase())) {
		return false
	}

	if (/[. ]$/.test(fileName)) {
		return false
	}

	if (fileName.length === 0 || fileName.length > 255) {
		return false
	}

	return true
}

export function sanitizeFileName(filename: string, replacement: string = "_"): string {
	const illegalCharsWindows = /[<>:"/\\|?*]/g
	const illegalCharsUnix = /\//g
	const reservedNamesWindows: Set<string> = new Set([
		"CON",
		"PRN",
		"AUX",
		"NUL",
		"COM1",
		"COM2",
		"COM3",
		"COM4",
		"COM5",
		"COM6",
		"COM7",
		"COM8",
		"COM9",
		"LPT1",
		"LPT2",
		"LPT3",
		"LPT4",
		"LPT5",
		"LPT6",
		"LPT7",
		"LPT8",
		"LPT9"
	])

	let sanitizedFilename = filename.replace(illegalCharsWindows, replacement)

	sanitizedFilename = sanitizedFilename.replace(illegalCharsUnix, replacement)
	sanitizedFilename = sanitizedFilename.replace(/[. ]+$/, "")

	if (reservedNamesWindows.has(sanitizedFilename.toUpperCase())) {
		sanitizedFilename += replacement
	}

	const maxLength = 255
	if (sanitizedFilename.length > maxLength) {
		sanitizedFilename = sanitizedFilename.substring(0, maxLength)
	}

	if (!sanitizedFilename) {
		return "file"
	}

	return sanitizedFilename
}

/**
 * Extract every possible directory path from a path.
 * @date 2/19/2024 - 6:02:06 AM
 *
 * @export
 * @param {string} path
 * @returns {string[]}
 */
export function getEveryPossibleDirectoryPath(path: string): string[] {
	const ex = path.split("/")

	if (ex.length <= 1) {
		return [path]
	}

	const paths: string[] = []

	for (let i = 0; i < ex.length; i++) {
		const toJoin = []

		for (let x = 0; x < i + 1; x++) {
			toJoin.push(ex[x])
		}

		paths.push(toJoin.join("/"))
	}

	if (paths.length <= 0) {
		return [path]
	}

	return paths
}

export function isValidHexColor(value: string, length: number = 6): boolean {
	const hexColorPattern = length >= 6 ? /^#([0-9A-Fa-f]{6})$/ : /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

	return hexColorPattern.test(value)
}
