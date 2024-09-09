export function generateCacheSteps(maxSizeGiB: number): number[] {
	const steps: number[] = []
	const stepSize = 10

	for (let size = stepSize; size <= maxSizeGiB; size += stepSize) {
		steps.push(size)
	}

	return steps
}
