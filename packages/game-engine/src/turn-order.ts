export function nextActivePlayerId(
  seatingOrder: readonly string[],
  activePlayerIds: ReadonlySet<string>,
  fromPlayerId: string,
): string | undefined {
  const startIndex = seatingOrder.indexOf(fromPlayerId);
  if (startIndex === -1 || activePlayerIds.size === 0) {
    return undefined;
  }

  for (let offset = 1; offset <= seatingOrder.length; offset += 1) {
    const candidate = seatingOrder[(startIndex + offset) % seatingOrder.length]!;
    if (activePlayerIds.has(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export function nextActivePlayerAtOrAfter(
  seatingOrder: readonly string[],
  activePlayerIds: ReadonlySet<string>,
  intendedPlayerId: string,
): string | undefined {
  const startIndex = seatingOrder.indexOf(intendedPlayerId);
  if (startIndex === -1 || activePlayerIds.size === 0) {
    return undefined;
  }

  for (let offset = 0; offset < seatingOrder.length; offset += 1) {
    const candidate = seatingOrder[(startIndex + offset) % seatingOrder.length]!;
    if (activePlayerIds.has(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
