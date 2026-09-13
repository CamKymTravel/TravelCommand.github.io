import { createExpense } from './src_core_entities.js';
import { resolveDestinationBudgetForDate, deriveAUDForStay } from './src_core_budget.js';
import { touchRecord } from './src_core_records.js';

const EXPENSE_FIELDS = Object.freeze([
  'budgetScope','itineraryId','date','category','needsBudgetRepair','description',
  'originalCurrency','originalAmount','audAmount'
]);

function pickExpenseFields(record) {
  return Object.fromEntries(EXPENSE_FIELDS.map(key => [key, record[key]]));
}

export function saveExpenseDraft(draft, { expenseId = null, fields }, options = {}) {
  const budgetScope = fields.budgetScope === 'annual' ? 'annual' : 'destination';
  let normalized;
  if (budgetScope === 'annual') {
    if (String(fields.category || '').trim().toLowerCase() !== 'miscellaneous') {
      throw new Error('Only Miscellaneous expenses can be allocated to the Annual Budget.');
    }
    normalized = {
      ...fields,
      budgetScope:'annual',
      itineraryId:null,
      needsBudgetRepair:false,
      originalCurrency:'AUD',
      audAmount:Number(fields.originalAmount ?? 0)
    };
  } else {
    const stay = resolveDestinationBudgetForDate(draft.itinerary || [], fields.date, { preferredItineraryId:fields.itineraryId || null });
    const localFields = {
      ...fields,
      budgetScope:'destination',
      originalCurrency:String(stay.localCurrency || '').trim().toUpperCase(),
      audAmount:null
    };
    normalized = {
      ...localFields,
      itineraryId:stay.id,
      needsBudgetRepair:false,
      audAmount:deriveAUDForStay(localFields, stay)
    };
  }
  const validated = createExpense(normalized, options);
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
