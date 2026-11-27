// Parameterised French renderings of the English sentences Ingenium builds with values (a count, a code). The first rule that
// matches applies. Keep each rule anchored (^…$) and its captures to values.
export const FR_RULES: [RegExp, string][] = [
  [/^(\d+) entries$/, '$1 entrée(s)'],
];
