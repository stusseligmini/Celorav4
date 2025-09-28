import { redirect } from 'next/navigation';

export default function MfaVerificationMobileRedirect() {
  redirect('/(mfa-mobile)/mfa-verification-mobile');
}