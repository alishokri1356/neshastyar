import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import { getStatusBadgeClass } from '@/lib/status';

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
  const visibleBullets = bulletPoints.slice(0, 3);
  const hasMoreBullets = bulletPoints.length > 3;

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer border border-border/50 bg-card/70 shadow-soft transition-all duration-300 hover:shadow-medium active:scale-[0.99]"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow">
            <User className="h-5 w-5 text-white" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-foreground">
                {title}
              </h4>
              {status && (
                <Badge
                  variant="outline"
                  className={`shrink-0 text-[10px] ${getStatusBadgeClass(status)}`}
                >
                  {status}
                </Badge>
              )}
            </div>

            {(dateText || durationText) && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                {dateText && <span>{dateText}</span>}
                {dateText && durationText && <span aria-hidden>•</span>}
                {durationText && <span>{durationText}</span>}
              </div>
            )}

            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      borderColor: tag.color,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
                {tags.length > 3 && (
                  <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    +{tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {visibleBullets.length > 0 && (
              <div className="mt-2 space-y-1">
                {visibleBullets.map((line, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <span className="mt-1 text-primary">•</span>
                    <span className="leading-relaxed">
                      {line.length > 80 ? `${line.substring(0, 77)}...` : line}
                    </span>
                  </div>
                ))}
                {hasMoreBullets && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-1 text-primary">•</span>
                    <span className="leading-relaxed">...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MeetingCard;
