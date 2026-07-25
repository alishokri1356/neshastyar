import { useState, useEffect, type KeyboardEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Loader2, Pencil, X, Check, MoreVertical } from "lucide-react";
import { mysqlClient } from "@/lib/mysql-client";
import { normalizeBulletPoints, parseMeetingSummaryJson } from "@/lib/meetingSummary";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment-jalaali";
import AppShell from "@/components/layout/AppShell";
import MeetingCard from "@/components/MeetingCard";
import EmptyState from "@/components/EmptyState";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ParticipantDetail = () => {
  const { participantId: routeParam } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const queryClient = useQueryClient();

  const isNoParticipants = routeParam === "no-participants";
  const isUuidParam = routeParam ? UUID_PATTERN.test(routeParam) : false;

  const { data: participantAndMeetings, isLoading } = useQuery({
    queryKey: ["participant-detail", routeParam],
    queryFn: async () => {
      if (!routeParam) return null;

      const {
        data: { user },
      } = await mysqlClient.auth.getUser();
      if (!user) return null;

      if (isNoParticipants) {
        const participant = {
          id: "no-participants",
          name: "بدون شرکت‌کننده",
          userId: user.id,
        };

        const { data, error } = await mysqlClient.participants.getMeetingsWithoutParticipants();
        if (error) {
          throw new Error(error.message || "Failed to load meetings");
        }

        const transformedMeetings = (data?.meetings ?? []).map((meeting: any) => ({
          id: meeting.id,
          fileName:
            meeting.title ||
            meeting.audio_file_name?.replace(/\.(wav|mp3|m4a)$/i, "") ||
            `Meeting ${new Date(meeting.meeting_date).toLocaleDateString()}`,
          date: new Date(meeting.meeting_date),
          summary: meeting.summary || "",
          status: meeting.status,
          duration: meeting.duration || 0,
          tags: [],
          userId: user.id,
        }));

        return { participant, meetings: transformedMeetings };
      }

      if (isUuidParam) {
        const { data, error } = await mysqlClient.participants.getMeetings(routeParam);
        if (error) {
          throw new Error(error.message || "Participant not found");
        }

        const transformedMeetings = (data?.meetings ?? []).map((meeting: any) => ({
          id: meeting.id,
          fileName:
            meeting.title ||
            meeting.audio_file_name?.replace(/\.(wav|mp3|m4a)$/i, "") ||
            `Meeting ${new Date(meeting.meeting_date).toLocaleDateString()}`,
          date: new Date(meeting.meeting_date),
          summary: meeting.summary || "",
          status: meeting.status,
          duration: meeting.duration || meeting.audio_duration || 0,
          tags: [],
          userId: user.id,
        }));

        return {
          participant: {
            id: data.participant.id,
            name: data.participant.name,
            userId: user.id,
          },
          meetings: transformedMeetings,
        };
      }

      const decodedName = decodeURIComponent(routeParam);
      const { data: listData } = await mysqlClient.participants.list();
      const matched = (listData?.participants ?? []).find(
        (p: { name: string; id: string }) => p.name === decodedName,
      );

      if (matched) {
        navigate(`/participant/${matched.id}`, { replace: true });
        return null;
      }

      return null;
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    enabled: !!routeParam,
  });

  const participant = (participantAndMeetings as any)?.participant || null;
  const meetings = (participantAndMeetings as any)?.meetings || [];

  useEffect(() => {
    if (participant?.name) {
      setEditedName(participant.name);
    }
  }, [participant?.name]);

  const canEditParticipant =
    !!participant &&
    !isNoParticipants &&
    participant.name !== "بدون شرکت‌کننده";

  const renameParticipantMutation = useMutation({
    mutationFn: async ({
      id,
      newName,
    }: {
      id: string;
      newName: string;
    }) => {
      const response = await mysqlClient.participants.rename({ id, newName });

      if ((response as any)?.error) {
        const rawError = (response as any).error;
        const message =
          typeof rawError === "string"
            ? rawError
            : rawError?.message ||
              rawError?.error ||
              "خطایی در بروزرسانی نام رخ داد.";
        throw new Error(message);
      }

      return (response as any).data;
    },
    onSuccess: (_data, variables) => {
      toast({
        title: "نام شرکت‌کننده بروزرسانی شد",
        description: "نام شرکت‌کننده با موفقیت به‌روزرسانی شد.",
      });

      setIsEditingName(false);
      setEditedName(variables.newName.trim());
      queryClient.invalidateQueries({ queryKey: ["participant-detail"] });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : (error as { message?: string; error?: string })?.message ||
              (error as { message?: string; error?: string })?.error ||
              "خطایی در بروزرسانی نام رخ داد.";

      toast({
        title: "خطا",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName(participant?.name ?? "");
  };

  const handleSaveName = () => {
    if (!participant || !canEditParticipant) {
      return;
    }

    if (renameParticipantMutation.isPending) {
      return;
    }

    const trimmedNewName = editedName.trim();
    const trimmedCurrentName = (participant.name || "").trim();

    if (!trimmedNewName) {
      toast({
        title: "نام نامعتبر است",
        description: "نام شرکت‌کننده نمی‌تواند خالی باشد.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedNewName === trimmedCurrentName) {
      setIsEditingName(false);
      setEditedName(participant.name || "");
      return;
    }

    renameParticipantMutation.mutate({
      id: participant.id,
      newName: trimmedNewName,
    });
  };

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSaveName();
    } else if (event.key === "Escape") {
      event.preventDefault();
      handleCancelEdit();
    }
  };

  const startEditingName = () => {
    if (!canEditParticipant || !participant?.name) {
      return;
    }
    setEditedName(participant.name);
    setIsEditingName(true);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return undefined;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getSummaryBullets = (summary: string): string[] => {
    if (!summary) return [];
    const parsed = parseMeetingSummaryJson(summary);
    if (parsed) {
      const bullets = normalizeBulletPoints(parsed['Bolet Points'] ?? parsed['Bullet Points']);
      if (bullets.length > 0) return bullets;
      if (typeof parsed.Summary === 'string') return [parsed.Summary];
    }
    return summary.split('\n').filter(Boolean);
  };

  if (isLoading) {
    return (
      <AppShell title="شرکت‌کننده" onBack="/participants" clickableBack>
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">در حال بارگذاری جزئیات شرکت‌کننده...</p>
        </div>
      </AppShell>
    );
  }

  if (!participant) {
    return (
      <AppShell title="شرکت‌کننده" onBack="/participants" clickableBack>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-2xl font-bold text-foreground">شرکت‌کننده پیدا نشد</h2>
          <Button onClick={() => navigate("/home")}>بازگشت به خانه</Button>
        </div>
      </AppShell>
    );
  }

  const headerActions = canEditParticipant ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="گزینه‌ها">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem onClick={startEditingName}>
          <Pencil className="me-2 h-4 w-4" />
          ویرایش نام
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : undefined;

  return (
    <AppShell
      title={participant.name}
      subtitle={`${meetings.length} جلسه`}
      onBack="/participants"
      clickableBack
      actions={headerActions}
    >
      <div className="space-y-4">
        {isEditingName && canEditParticipant && (
          <Card className="border border-border/50 bg-card/70">
            <CardContent className="space-y-3 p-4">
              <Label htmlFor="participant-name">ویرایش نام شرکت‌کننده</Label>
              <Input
                id="participant-name"
                value={editedName}
                onChange={(event) => setEditedName(event.target.value)}
                onKeyDown={handleNameKeyDown}
                autoFocus
                disabled={renameParticipantMutation.isPending}
                maxLength={120}
                placeholder="نام شرکت‌کننده"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleSaveName}
                  disabled={renameParticipantMutation.isPending || editedName.trim().length === 0}
                >
                  {renameParticipantMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      در حال ذخیره...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      ذخیره
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCancelEdit}
                  disabled={renameParticipantMutation.isPending}
                >
                  <X className="h-4 w-4" />
                  انصراف
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {meetings.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="هنوز جلسه‌ای نیست"
            description="ضبط جلسات را شروع کنید تا آنها را اینجا ببینید."
            action={
              <Button variant="primary" onClick={() => navigate("/record")}>
                ضبط جلسه
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {[...meetings]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  title={meeting.fileName}
                  dateText={`${moment(meeting.date).format("jYYYY/jMM/jDD")} - ${moment(meeting.date).format("HH:mm")}`}
                  durationText={formatDuration(meeting.duration)}
                  status={meeting.status}
                  bulletPoints={getSummaryBullets(meeting.summary)}
                  onClick={() => navigate(`/meeting/${meeting.id}`)}
                />
              ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default ParticipantDetail;
