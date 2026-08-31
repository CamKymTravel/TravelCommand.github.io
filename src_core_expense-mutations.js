import { createExpense } from './src_core_entities.js';
import { touchRecord } from './src_core_records.js';

const EXPENSE_FIELDS = Object.freeze([
  'itineraryId','date','category','allocation','description',
  'originalCurrency','originalAmount','audAmount'
]);

function pickExpenseFields(record) {
  return Object.fromEntries(EXPENSE_FIELDS.map(key => [key, record[key]]));
}

export function saveExpenseDraft(draft, { expenseId = null, fields }, options = {}) {
  const validated = createExpense(fields, options);
  if (!expenseId) {
    draft.expenses.push(validated);
    return validated;
  }
  const index = draft.expenses.findIndex(record => record.id === expenseId);
  if (index < 0) throw new Error('Expense entry not found');
  const saved = touchRecord(draft.expenses[index], pickExpenseFields(validated), options);
  draft.expenses[index] = saved;
  return saved;
}

export function deleteExpenseDraft(draft, expenseId) {
  const before = draft.expenses.length;
  draft.expenses = draft.expenses.filter(record => record.id !== expenseId);
  if (draft.expenses.length === before) throw new Error('Expense entry not found');
  return true;
}
