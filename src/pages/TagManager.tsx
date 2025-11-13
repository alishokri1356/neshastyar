import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { mysqlClient } from "@/lib/mysql-client";
import { ChevronLeft, GitMerge, Pencil, RefreshCw, Tag as TagIcon, Tags, Trash2 } from "lucide-react";
import type { CheckedState } from "@radix-ui/react-checkbox";

interface ManagedTag {
  id: string;
  name: string;
  color: string | null;
  meetingCount: number;
}

interface TagManagementResponse {
  tags?: Array<{
    id: string;
    name: string;
    color: string | null;
    meeting_count?: number;
    meetingCount?: number;
  }>;
  untaggedMeetingsCount?: number;
}

const TagManager: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tags, setTags] = useState<ManagedTag[]>([]);
  const [untaggedMeetingsCount, setUntaggedMeetingsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<ManagedTag | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<ManagedTag | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeTargetName, setMergeTargetName] = useState("");
  const [isMerging, setIsMerging] = useState(false);

  const loadTags = useCallback(
    async (options: { initial?: boolean } = {}) => {
      const { initial = false } = options;

      if (initial) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const { data, error } = await mysqlClient.tags.management();

        if (error) {
          const message =
            typeof error === "string"
              ? error
              : error?.message || error?.error || "خطایی در دریافت برچسب‌ها رخ داد.";
          throw new Error(message);
        }

        const payload = (data ?? {}) as TagManagementResponse;
        const tagList = (payload.tags ?? []).map((tag) => ({
          id: tag.id,
          name: tag.name,
          color: tag.color,
          meetingCount: Number(tag.meeting_count ?? tag.meetingCount ?? 0),
        }));

        setTags(tagList);
        setSelectedTagIds((previous) => previous.filter((id) => tagList.some((tag) => tag.id === id)));
        setUntaggedMeetingsCount(Number(payload.untaggedMeetingsCount ?? 0));
      } catch (error: any) {
        toast({
          title: "خطا در بارگذاری برچسب‌ها",
          description: error?.message || "امکان دریافت اطلاعات برچسب‌ها وجود ندارد.",
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
    loadTags({ initial: true });
  }, [loadTags]);

  const handleOpenRenameDialog = (tag: ManagedTag) => {
    setSelectedTag(tag);
    setNameInput(tag.name);
    setRenameDialogOpen(true);
  };

  const handleRenameDialogChange = (open: boolean) => {
    if (!open && isRenaming) {
      return;
    }

    setRenameDialogOpen(open);

    if (!open) {
      setSelectedTag(null);
      setNameInput("");
    }
  };

  const handleRenameTag = async () => {
    if (!selectedTag) {
      return;
    }

    const trimmedName = nameInput.trim();

    if (!trimmedName) {
      toast({
        title: "نام جدید وارد نشده است",
        description: "لطفاً یک نام معتبر برای برچسب وارد کنید.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedName === selectedTag.name) {
      toast({
        title: "نام بدون تغییر است",
        description: "برای بروزرسانی، نام جدیدی وارد کنید.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRenaming(true);
      const { data, error } = await mysqlClient.tags.rename({
        id: selectedTag.id,
        newName: trimmedName,
      });

      if (error) {
        const message =
          typeof error === "string"
            ? error
            : error?.message || error?.error || "خطایی در بروزرسانی نام برچسب رخ داد.";
        throw new Error(message);
      }

      toast({
        title: "نام برچسب بروزرسانی شد",
        description: `${selectedTag.name} به ${trimmedName} تغییر یافت.`,
      });

      handleRenameDialogChange(false);
      setSelectedTagIds([]);
      await loadTags();
    } catch (error: any) {
      toast({
        title: "خطا در بروزرسانی برچسب",
        description: error?.message || "امکان بروزرسانی نام برچسب وجود ندارد.",
        variant: "destructive",
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleOpenDeleteDialog = (tag: ManagedTag) => {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogChange = (open: boolean) => {
    if (!open && isRemoving) {
      return;
    }

    setDeleteDialogOpen(open);

    if (!open) {
      setTagToDelete(null);
    }
  };

  const handleRemoveTag = async () => {
    if (!tagToDelete) {
      return;
    }

    try {
      setIsRemoving(true);
      const { data, error } = await mysqlClient.tags.remove(tagToDelete.id);

      if (error) {
        const message =
          typeof error === "string"
            ? error
            : error?.message || error?.error || "خطایی در حذف برچسب رخ داد.";
        throw new Error(message);
      }

      toast({
        title: "برچسب حذف شد",
        description: `${tagToDelete.name} از لیست برچسب‌ها حذف شد.`,
      });

      const removedId = tagToDelete.id;
      setSelectedTagIds((previous) => previous.filter((id) => id !== removedId));
      handleDeleteDialogChange(false);
      await loadTags();
    } catch (error: any) {
      toast({
        title: "خطا در حذف برچسب",
        description: error?.message || "امکان حذف برچسب وجود ندارد.",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSelectAllChange = (checked: CheckedState) => {
    const isChecked = checked === true;

    if (isChecked) {
      setSelectedTagIds(tags.map((tag) => tag.id));
    } else {
      setSelectedTagIds([]);
    }
  };

  const handleToggleTagSelection = (id: string, checked: boolean) => {
    setSelectedTagIds((previous) => {
      if (checked) {
        if (previous.includes(id)) {
          return previous;
        }
        return [...previous, id];
      }
      return previous.filter((item) => item !== id);
    });
  };

  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [selectedTagIds, tags]
  );

  const handleOpenMergeDialog = () => {
    if (selectedTagIds.length < 2) {
      toast({
        title: "انتخاب ناکافی",
        description: "برای ادغام، حداقل دو برچسب را انتخاب کنید.",
        variant: "destructive",
      });
      return;
    }

    const defaultTarget =
      selectedTags
        .slice()
        .sort((a, b) => b.meetingCount - a.meetingCount)[0]?.name ?? "";

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

  const handleMergeTags = async () => {
    const trimmedTarget = mergeTargetName.trim();

    if (selectedTagIds.length < 2) {
      toast({
        title: "انتخاب ناکافی",
        description: "برای ادغام، حداقل دو برچسب را انتخاب کنید.",
        variant: "destructive",
      });
      return;
    }

    if (!trimmedTarget) {
      toast({
        title: "نام مقصد وارد نشده است",
        description: "لطفاً نام نهایی برچسب را وارد کنید.",
        variant: "destructive",
      });
      return;
    }

    const selectedTagNames = selectedTags.map((tag) => tag.name);
    let mergeSucceeded = false;

    try {
      setIsMerging(true);
      const { data, error } = await mysqlClient.tags.merge({
        sourceTagNames: selectedTagNames,
        targetTagName: trimmedTarget,
      });

      if (error) {
        const message =
          typeof error === "string"
            ? error
            : error?.message || error?.error || "خطایی در ادغام برچسب‌ها رخ داد.";
        throw new Error(message);
      }

      mergeSucceeded = true;

      const updatedMeetings = data?.updatedMeetings;
      toast({
        title: "برچسب‌ها ادغام شدند",
        description:
          updatedMeetings !== undefined
            ? `${updatedMeetings} جلسه بروزرسانی شد و برچسب‌های انتخاب‌شده در ${trimmedTarget} ادغام شدند.`
            : `برچسب‌های انتخاب‌شده در ${trimmedTarget} ادغام شدند.`,
      });

      setSelectedTagIds([]);
      await loadTags();
    } catch (error: any) {
      toast({
        title: "خطا در ادغام برچسب‌ها",
        description: error?.message || "امکان ادغام برچسب‌های انتخاب‌شده وجود ندارد.",
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

  const selectedCount = selectedTagIds.length;
  const allSelected = tags.length > 0 && selectedCount === tags.length;
  const partiallySelected = selectedCount > 0 && selectedCount < tags.length;
  const selectedTagNamesByCount = selectedTags
    .slice()
    .sort((a, b) => b.meetingCount - a.meetingCount)
    .map((tag) => tag.name);

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
          <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            بازگشت
          </Button>

          <h1 className="flex-1 text-center text-lg font-semibold text-foreground">مدیریت برچسب‌ها</h1>

          <Button
            variant="outline"
            className="flex items-center gap-2 whitespace-nowrap"
            onClick={() => loadTags()}
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
              <CardTitle className="text-base font-medium">کل برچسب‌ها</CardTitle>
              <Tags className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-semibold text-foreground">{tags.length}</span>
                <Badge variant="secondary" className="text-xs">
                  برچسب
                </Badge>
              </div>
              <CardDescription className="mt-2">تعداد کل برچسب‌های ثبت‌شده برای جلسات شما.</CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/80 backdrop-blur shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">جلسات بدون برچسب</CardTitle>
              <Badge variant="outline" className="text-xs">
                {untaggedMeetingsCount}
              </Badge>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-semibold text-foreground">{untaggedMeetingsCount}</span>
              <CardDescription className="mt-2">
                تعداد جلساتی که هنوز هیچ برچسبی برای آن‌ها ثبت نشده است.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 bg-white/80 backdrop-blur shadow-soft">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">فهرست برچسب‌ها</CardTitle>
              <CardDescription>
                نام برچسب‌ها را بروزرسانی یا حذف کنید تا تمامی جلسات مرتبط اصلاح شوند. همچنین می‌توانید چند برچسب
                را در یک نام مشترک ادغام کنید.
              </CardDescription>
            </div>
            <div className="flex flex-col w-full sm:w-auto gap-2">
              <div className="flex items-center justify-between sm:justify-end gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>تعداد:</span>
                  <Badge variant="secondary" className="text-xs">
                    {tags.length}
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
                ادغام برچسب‌ها
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {tags.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <TagIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-medium text-foreground">هیچ برچسبی ثبت نشده است</h3>
                <p className="text-muted-foreground text-sm">
                  پس از ثبت جلسات و افزودن برچسب‌ها، لیست آنها در این بخش نمایش داده خواهد شد.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">
                        <Checkbox
                          checked={allSelected ? true : partiallySelected ? "indeterminate" : false}
                          onCheckedChange={handleSelectAllChange}
                          aria-label="انتخاب همه برچسب‌ها"
                        />
                      </TableHead>
                      <TableHead className="w-2/5">نام برچسب</TableHead>
                      <TableHead className="w-1/5 text-center">تعداد جلسات</TableHead>
                      <TableHead className="w-1/5 text-center">رنگ</TableHead>
                      <TableHead className="w-1/5 text-left">اقدامات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tags.map((tag) => (
                      <TableRow key={tag.id}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={selectedTagIds.includes(tag.id)}
                            onCheckedChange={(checked) => handleToggleTagSelection(tag.id, checked === true)}
                            aria-label={`انتخاب ${tag.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded-full border border-border"
                              style={{ backgroundColor: tag.color ?? "#9ca3af" }}
                              aria-hidden="true"
                            />
                            {tag.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-xs px-2 py-1">
                            {tag.meetingCount} جلسه
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className="inline-flex h-6 w-6 rounded-full border border-border"
                            style={{ backgroundColor: tag.color ?? "#e5e7eb" }}
                            aria-label={`رنگ برچسب ${tag.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenRenameDialog(tag)}
                              aria-label={`تغییر نام ${tag.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleOpenDeleteDialog(tag)}
                              aria-label={`حذف ${tag.name}`}
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
            <DialogTitle>تغییر نام برچسب</DialogTitle>
            <DialogDescription>
              نام جدید برچسب را وارد کنید تا تمامی جلسات مرتبط با آن بروزرسانی شوند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="tag-new-name">نام جدید</Label>
            <Input
              id="tag-new-name"
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
            <Button onClick={handleRenameTag} disabled={isRenaming}>
              {isRenaming ? "در حال بروزرسانی..." : "ذخیره تغییرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeDialogOpen} onOpenChange={handleMergeDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ادغام برچسب‌ها</DialogTitle>
            <DialogDescription>
              برچسب‌های انتخاب‌شده در یک نام نهایی ادغام می‌شوند. لطفاً نام مقصد را مشخص کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>برچسب‌های انتخاب‌شده</Label>
              {selectedTagNamesByCount.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedTagNamesByCount.map((name) => (
                    <Badge key={name} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">هیچ برچسبی انتخاب نشده است.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="merge-target-name">نام مقصد</Label>
              <Input
                id="merge-target-name"
                value={mergeTargetName}
                onChange={(event) => setMergeTargetName(event.target.value)}
                disabled={isMerging}
                placeholder="نام برچسب نهایی را وارد کنید"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleMergeDialogChange(false)} disabled={isMerging}>
              انصراف
            </Button>
            <Button onClick={handleMergeTags} disabled={isMerging}>
              {isMerging ? "در حال ادغام..." : "ادغام"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف برچسب</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف {tagToDelete?.name} اطمینان دارید؟ این کار برچسب را از تمامی جلسات حذف می‌کند و بازگشت‌پذیر
              نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveTag}
              disabled={isRemoving}
            >
              {isRemoving ? "در حال حذف..." : "حذف برچسب"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TagManager;
