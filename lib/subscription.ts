/** Last moment (23:59:59.999) of the current calendar month, in server-local time. */
export function endOfCurrentMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
}
