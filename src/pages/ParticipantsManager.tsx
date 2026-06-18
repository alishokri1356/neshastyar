import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitMerge, Pencil, RefreshCw, Trash2, Users, MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AppShell from "@/components/layout/AppShell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { mysqlClient } from "@/lib/mysql-client";
import { formatRateLimitError } from "@/lib/utils";
import type { CheckedState } from "@radix-ui/react-checkbox";

interface Participant {
  name: string;
  meetingCount: number;
}

interface ParticipantsResponse {
  participants: Participant[];
  noParticipantsCount: number;
}

const ParticipantsManager: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [noParticipantsCount, setNoParticipantsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeTargetName, setMergeTargetName] = useState("");
  const [isMerging, setIsMerging] = useState(false);

  const loadParticipants = useCallback(
    async (options: { initial?: boolean } = {}) => {
      const { initial = false } = options;

      if (initial) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const { data, error } = await mysqlClient.participants.list();

        if (error) {
          const message =
            typeof error === "string"
              ? error
              : error?.message || error?.error || "خطایی در دریافت شرکت‌کنندگان رخ داد.";
          throw new Error(message);
        }

        const payload = (data ?? {}) as ParticipantsResponse;
        const participantList = payload.participants ?? [];
        setParticipants(participantList);
        setSelectedParticipants((previous) =>
          previous.filter((name) => participantList.some((participant) => participant.name === name))
        );
        setNoParticipantsCount(payload.noParticipantsCount ?? 0);
      } catch (error: any) {
        // Check if it's a rate limit error and format it accordingly
        const formattedError = formatRateLimitError(error);
        toast({
          title: formattedError.title === 'خطا' ? "خطا در بارگذاری شرکت‌کنندگان" : formattedError.title,
          description: formattedError.description,
          variant: "destructive",
        });
      } finally {
        if (initial) {
          setLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [toast]
  );

  useEffect(() => {
    loadParticipants({ initial: true });
  }, [loadParticipants]);

  const handleOpenRenameDialog = (participant: Participant) => {
    setSelectedParticipant(participant);
    setNameInput(participant.name);
    setRenameDialogOpen(true);
  };

  const handleRenameDialogChange = (open: boolean) => {
    if (!open && isRenaming) {
      return;
    }

    setRenameDialogOpen(open);

    if (!open) {
      setSelectedParticipant(null);
      setNameInput("");
    }
  };

  const handleRenameParticipant = async () => {
    if (!selectedParticipant) {
      return;
    }

    const trimmedName = nameInput.trim();

    if (!trimmedName) {
      toast({
        title: "نام جدید وارد نشده است",
        description: "لطفاً یک نام معتبر برای شرکت‌کننده وارد کنید.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedName === selectedParticipant.name) {
      toast({
        title: "نام بدون تغییر است",
        description: "برای بروزرسانی، نام جدیدی وارد کنید.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRenaming(true);
      const { data, error } = await mysqlClient.participants.rename({
        oldName: selectedParticipant.name,
        newName: trimmedName,
      });

      if (error) {
        const message =
          typeof error === "string"
            ? error
            : error?.message || error?.error || "خطایی در بروزرسانی نام رخ داد.";
        throw new Error(message);
      }

      toast({
        title: "نام شرکت‌کننده بروزرسانی شد",
        description:
          data?.updatedMeetings !== undefined
            ? `${data.updatedMeetings} جلسه با نام جدید بروزرسانی شد.`
            : `نام ${selectedParticipant.name} به ${trimmedName} تغییر یافت.`,
      });

        handleRenameDialogChange(false);
        setSelectedParticipants([]);
        await loadParticipants();
    } catch (error: any) {
      toast({
        title: "خطا در بروزرسانی نام",
        description: error?.message || "امکان بروزرسانی نام شرکت‌کننده وجود ندارد.",
        variant: "destructive",
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleOpenDeleteDialog = (participant: Participant) => {
    setParticipantToDelete(participant);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogChange = (open: boolean) => {
    if (!open && isRemoving) {
      return;
    }

    setDeleteDialogOpen(open);

    if (!open) {
      setParticipantToDelete(null);
    }
  };

  const handleRemoveParticipant = async () => {
    if (!participantToDelete) {
      return;
    }

    try {
      setIsRemoving(true);
      const { data, error } = await mysqlClient.participants.remove(participantToDelete.name);

      if (error) {
        const message =
          typeof error === "string"
            ? error
            : error?.message || error?.error || "خطایی در حذف شرکت‌کننده رخ داد.";
        throw new Error(message);
      }

      toast({
        title: "شرکت‌کننده حذف شد",
        description:
          data?.updatedMeetings !== undefined
            ? `${data.updatedMeetings} جلسه بروزرسانی شد و ${participantToDelete.name} حذف شد.`
            : `${participantToDelete.name} از جلسات حذف شد.`,
      });

        const removedName = participantToDelete.name;
        setSelectedParticipants((previous) => previous.filter((name) => name !== removedName));
      handleDeleteDialogChange(false);
      await loadParticipants();
    } catch (error: any) {
      toast({
        title: "خطا در حذف شرکت‌کننده",
        description: error?.message || "امکان حذف شرکت‌کننده وجود ندارد.",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSelectAllChange = (checked: CheckedState) => {
    const isChecked = checked === true;

    if (isChecked) {
      setSelectedParticipants(participants.map((participant) => participant.name));
    } else {
      setSelectedParticipants([]);
    }
  };

  const handleToggleParticipantSelection = (name: string, checked: boolean) => {
    setSelectedParticipants((previous) => {
      if (checked) {
        if (previous.includes(name)) {
          return previous;
        }
        return [...previous, name];
      }
      return previous.filter((item) => item !== name);
    });
  };

  const handleOpenMergeDialog = () => {
    if (selectedParticipants.length < 2) {
      toast({
        title: "انتخاب ناکافی",
        description: "برای ادغام، حداقل دو شرکت‌کننده را انتخاب کنید.",
        variant: "destructive",
      });
      return;
    }

    const defaultTarget =
      selectedParticipants
        .slice()
        .sort((a, b) => {
          const countA = participants.find((participant) => participant.name === a)?.meetingCount ?? 0;
          const countB = participants.find((participant) => participant.name === b)?.meetingCount ?? 0;
          return countB - countA;
        })[0] ?? "";

    setMergeTargetName(defaultTarget);
    setMergeDialogOpen(true);
  };

  const handleMergeDialogChange = (open: boolean) => {
    if (!open && isMerging) {
      return;
    }

    setMergeDialogOpen(open);

    if (!open) {
      setMergeTargetName("");
    }
  };

  const handleMergeParticipants = async () => {
    const trimmedTarget = mergeTargetName.trim();

    if (selectedParticipants.length < 2) {
      toast({
        title: "انتخاب ناکافی",
        description: "برای ادغام، حداقل دو شرکت‌کننده را انتخاب کنید.",
        variant: "destructive",
      });
      return;
    }

    if (!trimmedTarget) {
      toast({
        title: "نام مقصد وارد نشده است",
        description: "لطفاً نام نهایی شرکت‌کننده را وارد کنید.",
        variant: "destructive",
      });
      return;
    }

    let mergeSucceeded = false;

    try {
      setIsMerging(true);
      const { data, error } = await mysqlClient.participants.merge({
        sourceNames: selectedParticipants,
        targetName: trimmedTarget,
      });

      if (error) {
        const message =
          typeof error === "string"
            ? error
            : error?.message || error?.error || "خطایی در ادغام شرکت‌کنندگان رخ داد.";
        throw new Error(message);
      }

      mergeSucceeded = true;

      toast({
        title: "شرکت‌کنندگان ادغام شدند",
        description:
          data?.updatedMeetings !== undefined
            ? `${data.updatedMeetings} جلسه بروزرسانی شد و شرکت‌کنندگان انتخاب‌شده در ${trimmedTarget} ادغام شدند.`
            : `شرکت‌کنندگان انتخاب‌شده در ${trimmedTarget} ادغام شدند.`,
      });

      setSelectedParticipants([]);
      await loadParticipants();
    } catch (error: any) {
      toast({
        title: "خطا در ادغام شرکت‌کنندگان",
        description: error?.message || "امکان ادغام شرکت‌کنندگان انتخاب‌شده وجود ندارد.",
        variant: "destructive",
      });
    } finally {
      setIsMerging(false);
      if (mergeSucceeded) {
        setMergeDialogOpen(false);
        setMergeTargetName("");
      }
    }
  };

  const selectedCount = selectedParticipants.length;
  const allSelected = participants.length > 0 && selectedCount === participants.length;
  const partiallySelected = selectedCount > 0 && selectedCount < participants.length;
  const selectedParticipantsByCount = selectedParticipants
    .slice()
    .sort((a, b) => {
      const countA = participants.find((participant) => participant.name === a)?.meetingCount ?? 0;
      const countB = participants.find((participant) => participant.name === b)?.meetingCount ?? 0;
      return countB - countA;
    });

  const refreshAction = (
    <Button variant="ghost" size="icon" onClick={() => loadParticipants()} disabled={isRefreshing} aria-label="بروزرسانی">
      <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
    </Button>
  );

  if (loading) {
    return (
      <AppShell title="مدیریت شرکت‌کنندگان" onBack={() => navigate(-1)} hideNav actions={refreshAction}>
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="مدیریت شرکت‌کنندگان" onBack={() => navigate(-1)} hideNav actions={refreshAction}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-0 bg-white/80 backdrop-blur shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">کل شرکت‌کنندگان</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-semibold text-foreground">{participants.length}</span>
                <Badge variant="secondary" className="text-xs">
                  نفر
                </Badge>
              </div>
              <CardDescription className="mt-2">
                تعداد شرکت‌کنندگانی که در جلسات شما حضور داشته‌اند.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/80 backdrop-blur shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">جلسات بدون شرکت‌کننده</CardTitle>
              <Badge variant="outline" className="text-xs">
                {noParticipantsCount}
              </Badge>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-semibold text-foreground">{noParticipantsCount}</span>
              <CardDescription className="mt-2">
                تعداد جلساتی که شرکت‌کننده‌ای برای آن‌ها ثبت نشده است.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 bg-white/80 backdrop-blur shadow-soft">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">فهرست شرکت‌کنندگان</CardTitle>
              <CardDescription>
                نام شرکت‌کنندگان را بروزرسانی یا حذف کنید تا تمامی جلسات مرتبط اصلاح شوند. همچنین می‌توانید چند
                شرکت‌کننده را در یک نام مشترک ادغام کنید.
              </CardDescription>
            </div>
            <div className="flex flex-col w-full sm:w-auto gap-2">
              <div className="flex items-center justify-between sm:justify-end gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>تعداد:</span>
                  <Badge variant="secondary" className="text-xs">
                    {participants.length}
                  </Badge>
                </div>
                {selectedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline">انتخاب‌شده:</span>
                    <Badge variant="outline" className="text-xs">
                      {selectedCount}
                    </Badge>
                  </div>
                )}
              </div>
              <Button
                onClick={handleOpenMergeDialog}
                disabled={selectedCount < 2}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <GitMerge className="h-4 w-4" />
                ادغام شرکت‌کنندگان
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {participants.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Users className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-medium text-foreground">هیچ شرکت‌کننده‌ای ثبت نشده است</h3>
                <p className="text-muted-foreground text-sm">
                  پس از ثبت جلسات با شرکت‌کنندگان، لیست آن‌ها در این بخش نمایش داده خواهد شد.
                </p>
              </div>
            ) : (
                <div className="space-y-4">
                  {/* Mobile: stacked cards */}
                  <div className="space-y-2 md:hidden">
                    {participants.map((participant) => (
                      <div
                        key={participant.name}
                        className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 p-3"
                      >
                        <Checkbox
                          checked={selectedParticipants.includes(participant.name)}
                          onCheckedChange={(checked) =>
                            handleToggleParticipantSelection(participant.name, checked === true)
                          }
                          aria-label={`انتخاب ${participant.name}`}
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{participant.name}</p>
                          <p className="text-xs text-muted-foreground">{participant.meetingCount} جلسه</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0" aria-label={`اقدامات ${participant.name}`}>
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-40">
                            <DropdownMenuItem onClick={() => handleOpenRenameDialog(participant)}>
                              <Pencil className="me-2 h-4 w-4" />
                              تغییر نام
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenDeleteDialog(participant)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="me-2 h-4 w-4" />
                              حذف شرکت‌کننده
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: table */}
                  <Table className="hidden md:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">
                          <Checkbox
                            checked={allSelected ? true : partiallySelected ? "indeterminate" : false}
                            onCheckedChange={handleSelectAllChange}
                            aria-label="انتخاب همه شرکت‌کنندگان"
                          />
                        </TableHead>
                        <TableHead className="w-1/2">نام شرکت‌کننده</TableHead>
                        <TableHead className="w-1/4 text-center">تعداد جلسات</TableHead>
                        <TableHead className="w-1/4 text-left">اقدامات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map((participant) => (
                        <TableRow key={participant.name}>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={selectedParticipants.includes(participant.name)}
                              onCheckedChange={(checked) =>
                                handleToggleParticipantSelection(participant.name, checked === true)
                              }
                              aria-label={`انتخاب ${participant.name}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-foreground">{participant.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-xs px-2 py-1">
                              {participant.meetingCount} جلسه
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenRenameDialog(participant)}
                                aria-label={`تغییر نام ${participant.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleOpenDeleteDialog(participant)}
                                aria-label={`حذف ${participant.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {isRefreshing && (
                    <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin me-2" />
                      در حال بروزرسانی لیست...
                    </div>
                  )}
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={renameDialogOpen} onOpenChange={handleRenameDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تغییر نام شرکت‌کننده</DialogTitle>
            <DialogDescription>
              نام جدید شرکت‌کننده را وارد کنید تا تمامی جلسات مرتبط با آن بروزرسانی شوند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="participant-new-name">نام جدید</Label>
            <Input
              id="participant-new-name"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              disabled={isRenaming}
              placeholder="نام جدید را وارد کنید"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleRenameDialogChange(false)} disabled={isRenaming}>
              انصراف
            </Button>
            <Button onClick={handleRenameParticipant} disabled={isRenaming}>
              {isRenaming ? "در حال بروزرسانی..." : "ذخیره تغییرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        <Dialog open={mergeDialogOpen} onOpenChange={handleMergeDialogChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>ادغام شرکت‌کنندگان</DialogTitle>
              <DialogDescription>
                شرکت‌کنندگان انتخاب‌شده در یک نام نهایی ادغام می‌شوند. لطفاً نام مقصد را مشخص کنید.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>شرکت‌کنندگان انتخاب‌شده</Label>
                {selectedParticipantsByCount.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedParticipantsByCount.map((name) => (
                      <Badge key={name} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">هیچ شرکت‌کننده‌ای انتخاب نشده است.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="merge-target-name">نام مقصد</Label>
                <Input
                  id="merge-target-name"
                  value={mergeTargetName}
                  onChange={(event) => setMergeTargetName(event.target.value)}
                  disabled={isMerging}
                  placeholder="نام شرکت‌کننده نهایی را وارد کنید"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleMergeDialogChange(false)} disabled={isMerging}>
                انصراف
              </Button>
              <Button onClick={handleMergeParticipants} disabled={isMerging}>
                {isMerging ? "در حال ادغام..." : "ادغام"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف شرکت‌کننده</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف {participantToDelete?.name} اطمینان دارید؟ این کار نام او را از تمامی جلسات حذف
              می‌کند و بازگشت‌پذیر نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveParticipant}
              disabled={isRemoving}
            >
              {isRemoving ? "در حال حذف..." : "حذف شرکت‌کننده"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default ParticipantsManager;
