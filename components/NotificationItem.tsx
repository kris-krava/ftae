import Link from 'next/link';
import { Bell01, Heart, Shuffle01, MessageSquare01, ChevronRight, Star01 } from '@/components/icons';
import type { NotificationType } from '@/app/_lib/notifications';

interface NotificationItemProps {
  type: NotificationType;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
}

function iconFor(type: NotificationType): React.ReactNode {
  switch (type) {
    case 'referral_joined':
    case 'referral_completed':
      return <Heart className="w-[18px] h-[18px] text-accent" fill="currentColor" />;
    case 'trade_proposal':
    case 'trade_match':
      return <Shuffle01 className="w-[18px] h-[18px] text-accent" />;
    case 'system':
      return <MessageSquare01 className="w-[18px] h-[18px] text-accent" />;
    case 'profile_nudge':
    default:
      return <Bell01 className="w-[18px] h-[18px] text-accent" />;
  }
}

export function NotificationItem({ type, message, isRead, actionUrl }: NotificationItemProps) {
  const [title, body] = message.includes('\n') ? message.split('\n', 2) : [message, ''];
  // items-start keeps the leading icon pinned to the top when the text column
  // wraps to multiple lines. py-[18px] centers the 36px icon at single-line
  // height so short notifications still look like the original 72px row.
  const containerClass =
    'flex items-start gap-[12px] min-h-[72px] px-[14px] py-[18px] w-full ' +
    (isRead ? 'bg-accent/10' : 'bg-surface');

  const inner = (
    <>
      <div className="bg-accent/10 rounded-[10px] w-[36px] h-[36px] flex items-center justify-center shrink-0">
        {iconFor(type)}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
        <p className="font-sans font-semibold text-[14px] leading-[20px] text-ink">{title}</p>
        {body && (
          <p className="font-sans text-[13px] leading-[18px] text-muted">
            {body}
            {type === 'profile_nudge' && (
              <>
                {' '}
                <Star01
                  className="inline-block align-middle w-[14px] h-[14px] text-accent"
                  fill="currentColor"
                  aria-label="Founding Member"
                />
              </>
            )}
          </p>
        )}
      </div>
      {actionUrl && <ChevronRight className="w-[20px] h-[20px] text-ink shrink-0" />}
    </>
  );

  if (actionUrl) {
    return (
      <Link href={actionUrl} className={containerClass}>
        {inner}
      </Link>
    );
  }
  return <div className={containerClass}>{inner}</div>;
}
