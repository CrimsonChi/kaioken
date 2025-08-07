export const warnDeprecated = (
  featName: string,
  reason: string,
  solution: string
) => {
  console.warn(
    `[kiru]: "${featName}" is deprecated ${reason} and will be removed in future versions. ${solution}.`
  )
}
