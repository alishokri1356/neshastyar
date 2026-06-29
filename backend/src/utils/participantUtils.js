const PARTICIPANT_SUMMARY_KEYS = [
  'People in meetings',
  'People in Meetings',
  'participants',
  'Participants',
];

const safeJsonParse = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeAndFilterNames = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((name) => typeof name === 'string')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

const extractParticipantsFromMeeting = (meeting) => {
  const names = new Set();

  if (meeting.summary) {
    const summaryData = safeJsonParse(meeting.summary);
    if (summaryData && typeof summaryData === 'object') {
      PARTICIPANT_SUMMARY_KEYS.forEach((key) => {
        normalizeAndFilterNames(summaryData[key]).forEach((name) => names.add(name));
      });
    }
  }

  if (meeting.people) {
    const parsedPeople = safeJsonParse(meeting.people);

    if (Array.isArray(parsedPeople)) {
      normalizeAndFilterNames(parsedPeople).forEach((name) => names.add(name));
    } else if (
      parsedPeople &&
      typeof parsedPeople === 'object' &&
      Array.isArray(parsedPeople.people)
    ) {
      normalizeAndFilterNames(parsedPeople.people).forEach((name) => names.add(name));
    } else if (!parsedPeople) {
      meeting.people
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
        .forEach((name) => names.add(name));
    }
  }

  return Array.from(names);
};

const replaceNameInList = (list, oldName, newName) => {
  let changed = false;

  const updatedList = (Array.isArray(list) ? list : []).map((name) => {
    if (typeof name === 'string' && name.trim() === oldName) {
      changed = true;
      return newName;
    }
    return name;
  });

  return { changed, updatedList };
};

const removeNameFromList = (list, nameToRemove) => {
  let changed = false;

  const updatedList = (Array.isArray(list) ? list : []).filter((name) => {
    if (typeof name === 'string' && name.trim() === nameToRemove) {
      changed = true;
      return false;
    }
    return true;
  });

  return { changed, updatedList };
};

const mergeNamesIntoTarget = (list, sourceNamesSet, targetName) => {
  if (!Array.isArray(list)) {
    return { changed: false, updatedList: list };
  }

  const targetTrimmed = targetName.trim();
  let changed = false;
  const updatedList = [];
  const seen = new Set();

  for (const value of list) {
    if (typeof value !== 'string') {
      updatedList.push(value);
      continue;
    }

    const trimmedValue = value.trim();

    if (sourceNamesSet.has(trimmedValue)) {
      if (!seen.has(targetTrimmed)) {
        updatedList.push(targetTrimmed);
        seen.add(targetTrimmed);
      } else {
        changed = true;
      }

      if (trimmedValue !== targetTrimmed) {
        changed = true;
      }
      continue;
    }

    if (!seen.has(trimmedValue)) {
      updatedList.push(value);
      seen.add(trimmedValue);
    } else {
      changed = true;
    }
  }

  return { changed, updatedList };
};

module.exports = {
  PARTICIPANT_SUMMARY_KEYS,
  safeJsonParse,
  normalizeAndFilterNames,
  extractParticipantsFromMeeting,
  replaceNameInList,
  removeNameFromList,
  mergeNamesIntoTarget,
};
