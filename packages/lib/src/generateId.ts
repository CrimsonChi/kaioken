/**
 * Generates a random id
 * @param {number} [size=10] size of the id (in number of characters)
 * @param {string} [alphabet="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-"] set of characters to be used in the generation of the id
 * @returns {string} random id of length {@link size}
 */
export function generateRandomID(
  size: number = 10,
  alphabet: string = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-"
): string {
  let id = ""
  for (let i = 0; i < size; i++) {
    id += alphabet[(Math.random() * alphabet.length) | 0] // bitwise OR `|` is faster than `Math.floor()`
  }
  return id
}
