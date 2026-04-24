import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Wordmark } from '@/app/_components/Wordmark';
import { EditEmailForm } from './EditEmailForm';

export default async function EditEmailPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const currentEmail = user.email ?? '';

  return (
    <main className="bg-canvas min-h-dvh w-full flex flex-col items-center justify-center px-[32px] py-[64px] tab:px-[120px] desk:px-[320px]">
      <Wordmark variant="short" />
      <span aria-hidden className="h-[32px] w-px shrink-0" />
      <EditEmailForm currentEmail={currentEmail} />
    </main>
  );
}
