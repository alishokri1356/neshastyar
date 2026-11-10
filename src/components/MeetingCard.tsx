import { ArrowLeft } from "lucide-react";
import { isAnalyzingStatus } from "@/lib/neshastyarStatus";
import { NeshastyarCard, StatusChip } from "@/components/neshastyar/NeshastyarUi";

export interface MeetingTag {
  id: string;
  name: string;
  color: string;
}

interface MeetingCardProps {
  title: string;
  dateText?: string;
  durationText?: string;
  status?: string;
  tags?: MeetingTag[];
  bulletPoints?: string[];
  onClick?: () => void;
}

const MeetingCard = ({
  title,
  dateText,
  durationText,
  status,
  tags = [],
  bulletPoints = [],
  onClick,
}: MeetingCardProps) => {
  const visibleBullets = bulletPoints.slice(0, 2);

  return (
    <NeshastyarCard
      accentBar={isAnalyzingStatus(status)}
      onClick={onClick}
      className="p-4"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[16px] font-semibold text-[#1C1B18]">
            {title || "جلسه"}
          </p>

          {(dateText || durationText) ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-[#66625B]">
              {dateText ? <span>{dateText}</span> : null}
              {dateText && durationText ? <span aria-hidden>•</span> : null}
              {durationText ? <span>{durationText}</span> : null}
            </div>
          ) : null}

          {status ? (
            <div className="mt-2">
              <StatusChip status={status} />
            </div>
          ) : null}

          {tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-full border border-[#166534]/40 bg-[#EBF6F0] px-2.5 py-0.5 text-[11px] font-medium text-[#166534]"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}

          {visibleBullets.length > 0 ? (
            <div className="mt-2 space-y-0.5 text-[12px] text-[#66625B]">
              {visibleBullets.map((line, index) => (
                <p key={index} className="truncate">
                  • {line}
                </p>
              ))}
            </div>
          ) : null}
        </div>

        <ArrowLeft className="h-5 w-5 shrink-0 text-[#66625B]" />
      </div>
    </NeshastyarCard>
  );
};

export default MeetingCard;
