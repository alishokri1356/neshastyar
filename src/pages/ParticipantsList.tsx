import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/useAuthStore';
import { mysqlClient } from '@/lib/mysql-client';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeft, GitMerge, MoreVertical, Pencil, Search, Settings, UserCircle } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import EmptyState from '@/components/EmptyState';

interface Participant {
  id: string;
  name: string;
  meetingCount: number;
}

const ParticipantsList = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [noParticipantsCount, setNoParticipantsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeTargetName, setMergeTargetName] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredParticipants = useMemo(() => {
    if (!normalizedSearchQuery) {
      return participants;
    }

    return participants.filter((participant) =>
      participant.name.toLowerCase().includes(normalizedSearchQuery),
    );
  }, [participants, normalizedSearchQuery]);

  const showNoParticipantsCard =
    noParticipantsCount > 0 &&
    (!normalizedSearchQuery || 'بدون شرکت‌کننده'.includes(normalizedSearchQuery));

  const selectedCount = selectedParticipants.length;

  const selectedParticipantsByCount = selectedParticipants
    .slice()
    .sort((a, b) => {
      const countA = participants.find((p) => p.id === a)?.meetingCount ?? 0;
      const countB = participants.find((p) => p.id === b)?.meetingCount ?? 0;
      return countB - countA;
    })
    .map((id) => participants.find((p) => p.id === id))
    .filter((p): p is Participant => !!p);

  const shellSearchProps = {
    searchActive: searchOpen,
    searchValue: searchQuery,
    onSearchChange: setSearchQuery,
    onSearchClose: () => {
      setSearchOpen(false);
      setSearchQuery('');
    },
    searchPlaceholder: 'جستجوی شرکت‌کننده...',
  };

  const loadParticipants = useCallback(async () => {
    try {
      if (!user) return;

      const { data, error } = await mysqlClient.participants.list();

      if (error) {
        console.error('Error fetching participants:', error);
        toast({
          title: 'خطا در بارگذاری شرکت‌کنندگان',
          description: error.message || 'خطایی در دریافت لیست رخ داد.',
          variant: 'destructive',
        });
        return;
      }

      const list = data?.participants ?? [];
      setParticipants(list);
      setSelectedParticipants((prev) => prev.filter((id) => list.some((p) => p.id === id)));
      setNoParticipantsCount(data?.noParticipantsCount ?? 0);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast({
        title: 'خطا',
        description: 'خطایی در بارگذاری شرکت‌کنندگان رخ داد.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  const handleParticipantClick = (participantId: string) => {
    navigate(`/participant/${participantId}`);
  };

  const handleNoParticipantsClick = () => {
    navigate('/participant/no-participants');
  };

  const handleToggleSelection = (id: string, checked: boolean, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setSelectedParticipants((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  };

  const handleOpenRenameDialog = (participant: Participant, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setSelectedParticipant(participant);
    setNameInput(participant.name);
    setRenameDialogOpen(true);
  };

  const handleRenameDialogChange = (open: boolean) => {
    if (!open && isRenaming) return;
    setRenameDialogOpen(open);
    if (!open) {
      setSelectedParticipant(null);
      setNameInput('');
    }
  };

  const handleRenameParticipant = async () => {
    if (!selectedParticipant) return;

    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      toast({
        title: 'نام جدید وارد نشده است',
        description: 'لطفاً یک نام معتبر وارد کنید.',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedName === selectedParticipant.name) {
      handleRenameDialogChange(false);
      return;
    }

    try {
      setIsRenaming(true);
      const { data, error } = await mysqlClient.participants.rename({
        id: selectedParticipant.id,
        newName: trimmedName,
      });

      if (error) {
        const message =
          typeof error === 'string'
            ? error
            : error?.message || error?.error || 'خطایی در بروزرسانی نام رخ داد.';
        throw new Error(message);
      }

      toast({
        title: 'نام شرکت‌کننده بروزرسانی شد',
        description:
          data?.updatedMeetings !== undefined
            ? `${data.updatedMeetings} جلسه بروزرسانی شد.`
            : `نام به ${trimmedName} تغییر یافت.`,
      });

      handleRenameDialogChange(false);
      setSelectedParticipants([]);
      await loadParticipants();
    } catch (error: any) {
      toast({
        title: 'خطا در بروزرسانی نام',
        description: error?.message || 'امکان بروزرسانی نام وجود ندارد.',
        variant: 'destructive',
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleOpenMergeDialog = () => {
    if (selectedCount < 2) {
      toast({
        title: 'انتخاب ناکافی',
        description: 'برای ادغام، حداقل دو شرکت‌کننده را انتخاب کنید.',
        variant: 'destructive',
      });
      return;
    }

    const defaultTarget =
      selectedParticipantsByCount.find((p) => p.name.length > 0)?.name ?? '';

    setMergeTargetName(defaultTarget);
    setMergeDialogOpen(true);
  };

  const handleMergeDialogChange = (open: boolean) => {
    if (!open && isMerging) return;
    setMergeDialogOpen(open);
    if (!open) setMergeTargetName('');
  };

  const handleMergeParticipants = async () => {
    const trimmedTarget = mergeTargetName.trim();

    if (selectedCount < 2) {
      toast({
        title: 'انتخاب ناکافی',
        description: 'برای ادغام، حداقل دو شرکت‌کننده را انتخاب کنید.',
        variant: 'destructive',
      });
      return;
    }

    if (!trimmedTarget) {
      toast({
        title: 'نام مقصد وارد نشده است',
        description: 'لطفاً نام نهایی شرکت‌کننده را وارد کنید.',
        variant: 'destructive',
      });
      return;
    }

    let mergeSucceeded = false;

    try {
      setIsMerging(true);
      const { data, error } = await mysqlClient.participants.merge({
        sourceIds: selectedParticipants,
        targetName: trimmedTarget,
      });

      if (error) {
        const message =
          typeof error === 'string'
            ? error
            : error?.message || error?.error || 'خطایی در ادغام شرکت‌کنندگان رخ داد.';
        throw new Error(message);
      }

      mergeSucceeded = true;

      toast({
        title: 'شرکت‌کنندگان ادغام شدند',
        description:
          data?.updatedMeetings !== undefined
            ? `${data.updatedMeetings} جلسه بروزرسانی شد.`
            : `شرکت‌کنندگان در ${trimmedTarget} ادغام شدند.`,
      });

      setSelectedParticipants([]);
      await loadParticipants();
    } catch (error: any) {
      toast({
        title: 'خطا در ادغام',
        description: error?.message || 'امکان ادغام شرکت‌کنندگان وجود ندارد.',
        variant: 'destructive',
      });
    } finally {
      setIsMerging(false);
      if (mergeSucceeded) {
        setMergeDialogOpen(false);
        setMergeTargetName('');
      }
    }
  };

  const headerActions = (
    <>
      {selectedCount >= 2 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenMergeDialog}
          className="gap-1.5"
        >
          <GitMerge className="h-4 w-4" />
          ادغام ({selectedCount})
        </Button>
      )}
      {!searchOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSearchOpen(true)}
          aria-label="جستجوی شرکت‌کنندگان"
        >
          <Search className="h-5 w-5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/participants/manage')}
        aria-label="مدیریت پیشرفته شرکت‌کنندگان"
      >
        <Settings className="h-5 w-5" />
      </Button>
    </>
  );

  if (loading) {
    return (
      <AppShell
        title="شرکت‌کنندگان"
        subtitle="جلسات بر اساس افراد"
        actions={headerActions}
        {...shellSearchProps}
      >
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="شرکت‌کنندگان"
      subtitle="جلسات بر اساس افراد"
      actions={headerActions}
      {...shellSearchProps}
    >
      <div className="space-y-2.5">
        {selectedCount > 0 && selectedCount < 2 && (
          <p className="text-sm text-muted-foreground px-1">
            یک شرکت‌کننده دیگر انتخاب کنید تا بتوانید ادغام کنید.
          </p>
        )}

        {showNoParticipantsCard && (
          <Card
            className="cursor-pointer border border-border/50 bg-card/70 shadow-soft transition-all duration-300 hover:shadow-medium active:scale-[0.99]"
            onClick={handleNoParticipantsClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full border border-muted-foreground/40 bg-muted-foreground/20" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-foreground">بدون شرکت‌کننده</h3>
                  <p className="text-sm text-muted-foreground">{noParticipantsCount} جلسه</p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">{noParticipantsCount}</Badge>
                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        )}

        {filteredParticipants.map((participant) => {
          const isSelected = selectedParticipants.includes(participant.id);

          return (
            <Card
              key={participant.id}
              className={`cursor-pointer border bg-card/70 shadow-soft transition-all duration-300 hover:shadow-medium active:scale-[0.99] ${
                isSelected ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/50'
              }`}
              onClick={() => handleParticipantClick(participant.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleToggleSelection(participant.id, checked === true)
                    }
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`انتخاب ${participant.name}`}
                    className="shrink-0"
                  />
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <UserCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-foreground">{participant.name}</h3>
                    <p className="text-sm text-muted-foreground">{participant.meetingCount} جلسه</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs hidden sm:inline-flex">
                    {participant.meetingCount}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        aria-label={`اقدامات ${participant.name}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRenameDialog(participant);
                        }}
                      >
                        <Pencil className="me-2 h-4 w-4" />
                        تغییر نام
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredParticipants.length === 0 && !showNoParticipantsCard && (
          <EmptyState
            icon={UserCircle}
            title={normalizedSearchQuery ? 'نتیجه‌ای یافت نشد' : 'هنوز شرکت‌کننده‌ای ندارید'}
            description={
              normalizedSearchQuery
                ? 'عبارت جستجو را تغییر دهید'
                : 'جلسه‌ای ضبط کنید تا شرکت‌کنندگان نمایش داده شوند'
            }
          />
        )}
      </div>

      <Dialog open={renameDialogOpen} onOpenChange={handleRenameDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تغییر نام شرکت‌کننده</DialogTitle>
            <DialogDescription>
              نام جدید در تمامی جلسات مرتبط بروزرسانی می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="participant-rename">نام جدید</Label>
            <Input
              id="participant-rename"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              disabled={isRenaming}
              placeholder="نام جدید را وارد کنید"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleRenameDialogChange(false)} disabled={isRenaming}>
              انصراف
            </Button>
            <Button onClick={handleRenameParticipant} disabled={isRenaming}>
              {isRenaming ? 'در حال بروزرسانی...' : 'ذخیره'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeDialogOpen} onOpenChange={handleMergeDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ادغام شرکت‌کنندگان</DialogTitle>
            <DialogDescription>
              شرکت‌کنندگان انتخاب‌شده در یک نام نهایی ادغام می‌شوند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>انتخاب‌شده</Label>
              <div className="flex flex-wrap gap-2">
                {selectedParticipantsByCount.map((p) => (
                  <Badge key={p.id} variant="secondary" className="text-xs">
                    {p.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="merge-target">نام نهایی</Label>
              <Input
                id="merge-target"
                value={mergeTargetName}
                onChange={(e) => setMergeTargetName(e.target.value)}
                disabled={isMerging}
                placeholder="نام شرکت‌کننده پس از ادغام"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleMergeDialogChange(false)} disabled={isMerging}>
              انصراف
            </Button>
            <Button onClick={handleMergeParticipants} disabled={isMerging}>
              {isMerging ? 'در حال ادغام...' : 'ادغام'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default ParticipantsList;
