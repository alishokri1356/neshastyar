import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil, RefreshCw, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
        setParticipants(payload.participants ?? []);
        setNoParticipantsCount(payload.noParticipantsCount ?? 0);
      } catch (error: any) {
        toast({
          title: "خطا در بارگذاری شرکت‌کنندگان",
          description: error?.message || "امکان دریافت اطلاعات شرکت‌کنندگان وجود ندارد.",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <header className="bg-white/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            بازگشت
          </Button>

          <h1 className="flex-1 text-center text-lg font-semibold text-foreground">
            مدیریت شرکت‌کنندگان
          </h1>

          <Button
            variant="outline"
            className="flex items-center gap-2 whitespace-nowrap"
            onClick={() => loadParticipants()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            بروزرسانی
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
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
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">فهرست شرکت‌کنندگان</CardTitle>
              <CardDescription>
                نام شرکت‌کنندگان را بروزرسانی یا حذف کنید تا تمامی جلسات مرتبط اصلاح شوند.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>تعداد:</span>
              <Badge variant="secondary" className="text-xs">
                {participants.length}
              </Badge>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/2">نام شرکت‌کننده</TableHead>
                      <TableHead className="w-1/4 text-center">تعداد جلسات</TableHead>
                      <TableHead className="w-1/4 text-left">اقدامات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((participant) => (
                      <TableRow key={participant.name}>
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
                    <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                    در حال بروزرسانی لیست...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

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
    </div>
  );
};

export default ParticipantsManager;
