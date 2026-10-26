'use strict';
/* order_index values for reordering one group of assignments (a course day in
   Command's Content workspace) without renumbering the rest of the course.

   The group keeps its own existing slots — the sorted list of its current
   order_index values — so items outside the group keep their positions
   relative to it. Ties are common in this data (several items share a
   value), and a permutation of tied values changes nothing, so the slots are
   made strictly increasing: each one is at least one more than the one
   before. That can nudge a tied group slightly later, never earlier.

   currentValues: the group's current order_index values (any order).
   Returns: the values to assign to the group's items, in their new order. */
function reorderSlots(currentValues) {
  const sorted = [...currentValues].map((v) => Number(v) || 0).sort((a, b) => a - b);
  const slots = [];
  for (const v of sorted) slots.push(slots.length === 0 ? v : Math.max(v, slots[slots.length - 1] + 1));
  return slots;
}

module.exports = { reorderSlots };
