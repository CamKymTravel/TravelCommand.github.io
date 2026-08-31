import { formatAUDate, toISODate } from './src_core_dates.js';
import { findNextDestination } from './src_core_planning.js';

function normalizeListType(value) { return value === 'destination' ? 'destination' : 'permanent'; }

function itemView(item, currentDate) {
  const dueDate = item.dueDate ? toISODate(item.dueDate) : null;
  return {
    id:item.id,
    listType:item.listType,
    itineraryId:item.itineraryId || null,
    title:item.title,
    notes:item.notes || '',
    dueDate,
    displayDueDate:dueDate ? formatAUDate(dueDate) : '',
    completed:Boolean(item.completed),
    completedAt:item.completedAt || null,
    overdue:Boolean(dueDate && !item.completed && dueDate < currentDate)
  };
}

function sortItems(items) {
  return [...items].sort((a, b) => Number(a.completed) - Number(b.completed) || String(a.dueDate || '9999-12-31').localeCompare(String(b.dueDate || '9999-12-31')) || a.title.localeCompare(b.title));
}

function progress(items) {
  const total = items.length;
  const completed = items.filter(item => item.completed).length;
  return { total, completed, remaining:total - completed, percent:total ? Math.round((completed / total) * 100) : 0 };
}

function historyGroups(state, currentDate, activeDestinationId) {
  const itineraryById = new Map((state.itinerary || []).map(item => [item.id, item]));
  const groups = new Map();
  for (const raw of state.checklists || []) {
    if (raw.listType !== 'destination' || !raw.itineraryId || raw.itineraryId === activeDestinationId) continue;
    const itinerary = itineraryById.get(raw.itineraryId);
    if (!itinerary || toISODate(itinerary.endDate) >= currentDate) continue;
    if (!groups.has(raw.itineraryId)) groups.set(raw.itineraryId, { itinerary, items:[] });
    groups.get(raw.itineraryId).items.push(itemView(raw, currentDate));
  }
  return [...groups.values()]
    .map(group => ({
      itineraryId:group.itinerary.id,
      name:group.itinerary.name,
      country:group.itinerary.country || '',
      endDate:group.itinerary.endDate,
      displayDates:`${formatAUDate(group.itinerary.startDate)} – ${formatAUDate(group.itinerary.endDate)}`,
      items:sortItems(group.items),
      progress:progress(group.items)
    }))
    .sort((a, b) => b.endDate.localeCompare(a.endDate));
}

export function buildChecklistViewModel(state, currentDate, options = {}) {
  const today = toISODate(currentDate);
  const listType = normalizeListType(options.listType || state.ui?.checklistListType);
  const nextDestination = findNextDestination(state.itinerary || [], today);
  const permanent = sortItems((state.checklists || []).filter(item => item.listType === 'permanent').map(item => itemView(item, today)));
  const destination = nextDestination
    ? sortItems((state.checklists || []).filter(item => item.listType === 'destination' && item.itineraryId === nextDestination.id).map(item => itemView(item, today)))
    : [];
  const permanentProgress = progress(permanent);
  const destinationProgress = progress(destination);
  const activeItems = listType === 'destination' ? destination : permanent;
  const activeProgress = progress(activeItems);
  const required = [...permanent, ...destination];
  const requiredProgress = progress(required);
  const readyStatus = !nextDestination
    ? 'no-next-destination'
    : !required.length
      ? 'needs-setup'
      : requiredProgress.remaining === 0 ? 'ready' : 'not-ready';

  return {
    listType,
    nextDestination:nextDestination ? {
      id:nextDestination.id,
      name:nextDestination.name,
      country:nextDestination.country || '',
      startDate:nextDestination.startDate,
      displayStartDate:formatAUDate(nextDestination.startDate)
    } : null,
    permanent,
    destination,
    activeItems,
    activeProgress,
    permanentProgress,
    destinationProgress,
    ready:{
      status:readyStatus,
      completed:requiredProgress.completed,
      total:requiredProgress.total,
      remaining:requiredProgress.remaining,
      percent:requiredProgress.percent,
      overdue:required.filter(item => item.overdue).length
    },
    history:historyGroups(state, today, nextDestination?.id || null)
  };
}
