import { redirect } from 'next/navigation';

export default function MfaRecoveryMobileRedirect() {
  redirect('/(mfa-mobile)/mfa-recovery-mobile');
}