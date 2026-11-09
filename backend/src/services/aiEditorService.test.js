jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('./tagService', () => ({
  createTag: jest.fn(async (userId, { name }) => ({ id: `tag-${name}`, name })),
}));

jest.mock('./meetingTagService', () => ({
  getTagsForMeeting: jest.fn(),
  createMeetingTag: jest.fn(async () => ({})),
  deleteMeetingTag: jest.fn(async () => true),
}));

jest.mock('./meetingParticipantService', () => ({
  getParticipantsForMeeting: jest.fn(),
  addParticipantByNameToMeeting: jest.fn(async () => ({})),
  removeParticipantFromMeeting: jest.fn(async () => true),
}));

const db = require('../config/database');
const tagService = require('./tagService');
const meetingTagService = require('./meetingTagService');
const meetingParticipantService = require('./meetingParticipantService');
const aiEditorService = require('./aiEditorService');

const summaryJson = {
  Subject: 'بررسی زیرساخت',
  Location: '',
  Summary: 'خلاصه قدیمی',
  'Bolet Points': [{ 'تصمیم': 'خرید دیسک', 'مسئول': 'علی' }, 'نکته دوم'],
  'People in meetings': ['رضا'],
  Tags: ['زیرساخت'],
};

const meetingRow = {
  id: 'm1',
  user_id: 'u1',
  title: 'جلسه هفتگی',
  meeting_date: new Date('2026-11-02T13:24:00Z'),
  summary: JSON.stringify(summaryJson),
  transcription: 'متن جلسه',
  CommentText: null,
};

function editedFrom(overrides = {}) {
  return {
    title: 'جلسه هفتگی',
    subject: 'بررسی زیرساخت',
    location: '',
    summary: 'خلاصه قدیمی',
    bullet_points: ['تصمیم: خرید دیسک — مسئول: علی', 'نکته دوم'],
    participants: ['علی'],
    tags: ['IT'],
    meeting_date: null,
    changes_summary: 'تغییری اعمال شد',
    ...overrides,
  };
}

describe('aiEditorService.editMeeting', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_EDITOR_WEBHOOK_URL = 'https://example.com/ai-editor';
    process.env.INTERNAL_WEBHOOK_SECRET = 'secret';
    db.query.mockImplementation(async (sql) => {
      if (sql.startsWith('SELECT * FROM meetings')) return [meetingRow];
      if (sql.includes('FROM tags')) return [];
      return { affectedRows: 1 };
    });
    meetingParticipantService.getParticipantsForMeeting.mockResolvedValue([{ id: 'p1', name: 'علی' }]);
    meetingTagService.getTagsForMeeting.mockResolvedValue([{ id: 't1', name: 'IT' }]);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function mockWebhook(edited, status = 200) {
    global.fetch = jest.fn(async () => ({
      ok: status === 200,
      status,
      json: async () => (status === 200 ? { ok: true, edited, model: 'nvidia' } : { ok: false, error: 'x' }),
    }));
  }

  test('sends meeting details, tags, participants and transcript to the webhook', async () => {
    mockWebhook(editedFrom());
    await aiEditorService.editMeeting('u1', 'm1', 'تغییری نده');

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://example.com/ai-editor');
    expect(options.headers['x-internal-secret']).toBe('secret');
    const payload = JSON.parse(JSON.parse(options.body).user);
    expect(payload.instruction).toBe('تغییری نده');
    expect(payload.meeting.participants).toEqual(['علی']);
    expect(payload.meeting.tags).toEqual(['IT']);
    expect(payload.meeting.suggested_participants).toEqual(['رضا']);
    expect(payload.meeting.meeting_date).toMatchObject({ year: 1405, month: 8, day: 11, hour: 16, minute: 54 });
    expect(payload.transcript).toBe('متن جلسه');
  });

  test('unchanged result does not write meeting fields or links', async () => {
    mockWebhook(editedFrom());
    await aiEditorService.editMeeting('u1', 'm1', 'تغییری نده');

    expect(db.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE meetings'))).toBe(false);
    expect(meetingParticipantService.addParticipantByNameToMeeting).not.toHaveBeenCalled();
    expect(meetingParticipantService.removeParticipantFromMeeting).not.toHaveBeenCalled();
    expect(meetingTagService.createMeetingTag).not.toHaveBeenCalled();
    expect(meetingTagService.deleteMeetingTag).not.toHaveBeenCalled();
  });

  test('applies date, location, participant and tag edits', async () => {
    mockWebhook(editedFrom({
      location: 'دفتر تهران',
      participants: ['رضا'],
      tags: ['IT', 'مانیتورینگ'],
      meeting_date: { year: 1405, month: 8, day: 15, hour: 10, minute: 30 },
    }));

    const result = await aiEditorService.editMeeting('u1', 'm1', 'تاریخ و محل را عوض کن');

    const update = db.query.mock.calls.find(([sql]) => sql.startsWith('UPDATE meetings'));
    expect(update[0]).toContain('meeting_date = ?');
    expect(update[1]).toContain('2026-11-06 07:00:00');
    const savedSummary = JSON.parse(update[1].find((v) => typeof v === 'string' && v.startsWith('{')));
    expect(savedSummary.Location).toBe('دفتر تهران');
    expect(savedSummary['Bolet Points'][0]).toEqual(summaryJson['Bolet Points'][0]);

    expect(meetingParticipantService.removeParticipantFromMeeting).toHaveBeenCalledWith('u1', 'm1', 'p1');
    expect(meetingParticipantService.addParticipantByNameToMeeting).toHaveBeenCalledWith('u1', 'm1', 'رضا');
    expect(tagService.createTag).toHaveBeenCalledWith('u1', { name: 'مانیتورینگ' });
    expect(meetingTagService.createMeetingTag).toHaveBeenCalledWith('u1', 'm1', 'tag-مانیتورینگ');
    expect(meetingTagService.deleteMeetingTag).not.toHaveBeenCalled();
    expect(result.model_used).toBe('nvidia');
    expect(result.changes_summary).toBe('تغییری اعمال شد');
  });

  test('webhook failure returns 502 and saves nothing', async () => {
    mockWebhook(null, 502);
    await expect(aiEditorService.editMeeting('u1', 'm1', 'عنوان را عوض کن')).rejects.toMatchObject({ status: 502 });
    expect(db.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE meetings'))).toBe(false);
  });

  test('rejects empty prompt with 400', async () => {
    await expect(aiEditorService.editMeeting('u1', 'm1', '  ')).rejects.toMatchObject({ status: 400 });
  });
});
