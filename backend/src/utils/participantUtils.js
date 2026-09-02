const PARTICIPANT_SUMMARY_KEYS = [
  'People in meetings',
  'People in Meetings',
  'participants',
  'Participants',
];

const TAG_SUMMARY_KEYS = ['Tags', 'tags'];
const { parseMeetingSummaryJson } = require('./summaryUtils');

const safeJsonParse = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  return parseMeetingSummaryJson(value);
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

const replaceNameInText = (text, oldName, newName) => {
  if (!text || typeof text !== 'string' || !oldName || oldName === newName) {
    return { changed: false, updated: text };
  }

  const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'g');
  const updated = text.replace(regex, newName);

  return { changed: updated !== text, updated };
};

const applyParticipantRenameToPeopleField = (peopleValue, oldName, newName) => {
  if (!peopleValue) {
    return { changed: false, updated: peopleValue };
  }

  try {
    const parsedPeople = JSON.parse(peopleValue);

    if (Array.isArray(parsedPeople)) {
      const { changed, updatedList } = replaceNameInList(parsedPeople, oldName, newName);
      if (changed) {
        return { changed: true, updated: JSON.stringify(updatedList) };
      }
      return { changed: false, updated: peopleValue };
    }

    if (parsedPeople && typeof parsedPeople === 'object' && Array.isArray(parsedPeople.people)) {
      const { changed, updatedList } = replaceNameInList(parsedPeople.people, oldName, newName);
      if (changed) {
        parsedPeople.people = updatedList;
        return { changed: true, updated: JSON.stringify(parsedPeople) };
      }
      return { changed: false, updated: peopleValue };
    }
  } catch {
    const rawPeople = peopleValue
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (rawPeople.length > 0) {
      const { changed, updatedList } = replaceNameInList(rawPeople, oldName, newName);
      if (changed) {
        return { changed: true, updated: updatedList.join(', ') };
      }
    }
  }

  return { changed: false, updated: peopleValue };
};

const SUMMARY_TEXT_KEYS = ['Summary', 'Subject'];
const SUMMARY_BULLET_KEYS = ['Bolet Points', 'Bullet Points'];

const applyParticipantRenameToSummaryField = (summaryValue, oldName, newName) => {
  if (!summaryValue) {
    return { changed: false, updated: summaryValue };
  }

  const summaryData = parseMeetingSummaryJson(summaryValue);
  if (!summaryData || typeof summaryData !== 'object') {
    return { changed: false, updated: summaryValue };
  }

  let changed = false;

  PARTICIPANT_SUMMARY_KEYS.forEach((key) => {
    if (Array.isArray(summaryData[key])) {
      const { changed: listChanged, updatedList } = replaceNameInList(summaryData[key], oldName, newName);
      if (listChanged) {
        summaryData[key] = updatedList;
        changed = true;
      }
    }
  });

  SUMMARY_TEXT_KEYS.forEach((key) => {
    if (typeof summaryData[key] === 'string') {
      const { changed: textChanged, updated } = replaceNameInText(summaryData[key], oldName, newName);
      if (textChanged) {
        summaryData[key] = updated;
        changed = true;
      }
    }
  });

  SUMMARY_BULLET_KEYS.forEach((key) => {
    if (Array.isArray(summaryData[key])) {
      summaryData[key] = summaryData[key].map((point) => {
        if (typeof point !== 'string') {
          return point;
        }

        const { changed: pointChanged, updated } = replaceNameInText(point, oldName, newName);
        if (pointChanged) {
          changed = true;
          return updated;
        }

        return point;
      });
    }
  });

  if (changed) {
    return { changed: true, updated: JSON.stringify(summaryData) };
  }

  return { changed: false, updated: summaryValue };
};

const renameParticipantInMeetingRecord = (meeting, oldName, newName) => {
  let changed = false;
  let updatedSummary = meeting.summary ?? null;
  let updatedPeople = meeting.people ?? null;
  let updatedTranscription = meeting.transcription ?? null;

  const peopleResult = applyParticipantRenameToPeopleField(meeting.people, oldName, newName);
  if (peopleResult.changed) {
    updatedPeople = peopleResult.updated;
    changed = true;
  }

  const summaryResult = applyParticipantRenameToSummaryField(meeting.summary, oldName, newName);
  if (summaryResult.changed) {
    updatedSummary = summaryResult.updated;
    changed = true;
  }

  if (meeting.transcription) {
    const transcriptionResult = replaceNameInText(meeting.transcription, oldName, newName);
    if (transcriptionResult.changed) {
      updatedTranscription = transcriptionResult.updated;
      changed = true;
    }
  }

  return {
    changed,
    updatedSummary,
    updatedPeople,
    updatedTranscription,
  };
};

const removeNameFromListCaseInsensitive = (list, nameToRemove) => {
  const normalizedRemove = nameToRemove.trim().toLowerCase();
  let changed = false;

  const updatedList = (Array.isArray(list) ? list : []).filter((name) => {
    if (typeof name === 'string' && name.trim().toLowerCase() === normalizedRemove) {
      changed = true;
      return false;
    }
    return true;
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

const removeNamesFromListCaseInsensitive = (list, namesToRemove) => {
  let changed = false;
  let updatedList = Array.isArray(list) ? [...list] : [];

  for (const name of namesToRemove) {
    const result = removeNameFromListCaseInsensitive(updatedList, name);
    if (result.changed) {
      changed = true;
      updatedList = result.updatedList;
    }
  }

  return { changed, updatedList };
};

const removeNamesFromMeetingSuggestions = (
  meeting,
  namesToRemove,
  { updateParticipantKeys = true, updateTagKeys = true } = {}
) => {
  const names = normalizeAndFilterNames(namesToRemove);
  if (names.length === 0) {
    return {
      updatedSummary: meeting.summary ?? null,
      updatedPeople: meeting.people ?? null,
      changed: false,
    };
  }

  let changed = false;
  let updatedSummary = meeting.summary ?? null;
  let updatedPeople = meeting.people ?? null;

  if (meeting.summary) {
    const summaryData = safeJsonParse(meeting.summary);
    if (summaryData && typeof summaryData === 'object') {
      let summaryChanged = false;

      if (updateParticipantKeys) {
        PARTICIPANT_SUMMARY_KEYS.forEach((key) => {
          if (Array.isArray(summaryData[key])) {
            const result = removeNamesFromListCaseInsensitive(summaryData[key], names);
            if (result.changed) {
              summaryData[key] = result.updatedList;
              summaryChanged = true;
            }
          }
        });
      }

      if (updateTagKeys) {
        TAG_SUMMARY_KEYS.forEach((key) => {
          if (Array.isArray(summaryData[key])) {
            const result = removeNamesFromListCaseInsensitive(summaryData[key], names);
            if (result.changed) {
              summaryData[key] = result.updatedList;
              summaryChanged = true;
            }
          }
        });
      }

      if (summaryChanged) {
        updatedSummary = JSON.stringify(summaryData);
        changed = true;
      }
    }
  }

  if (updateParticipantKeys && meeting.people) {
    const parsedPeople = safeJsonParse(meeting.people);

    if (Array.isArray(parsedPeople)) {
      const result = removeNamesFromListCaseInsensitive(parsedPeople, names);
      if (result.changed) {
        updatedPeople = result.updatedList.length > 0 ? JSON.stringify(result.updatedList) : null;
        changed = true;
      }
    } else if (
      parsedPeople &&
      typeof parsedPeople === 'object' &&
      Array.isArray(parsedPeople.people)
    ) {
      const result = removeNamesFromListCaseInsensitive(parsedPeople.people, names);
      if (result.changed) {
        parsedPeople.people = result.updatedList;
        updatedPeople =
          parsedPeople.people.length > 0 ? JSON.stringify(parsedPeople) : null;
        changed = true;
      }
    } else if (!parsedPeople) {
      const rawPeople = meeting.people
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
      const result = removeNamesFromListCaseInsensitive(rawPeople, names);
      if (result.changed) {
        updatedPeople = result.updatedList.length > 0 ? result.updatedList.join(', ') : null;
        changed = true;
      }
    }
  }

  return { updatedSummary, updatedPeople, changed };
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
  TAG_SUMMARY_KEYS,
  safeJsonParse,
  normalizeAndFilterNames,
  extractParticipantsFromMeeting,
  replaceNameInList,
  removeNameFromList,
  removeNameFromListCaseInsensitive,
  removeNamesFromListCaseInsensitive,
  removeNamesFromMeetingSuggestions,
  mergeNamesIntoTarget,
  replaceNameInText,
  renameParticipantInMeetingRecord,
};
