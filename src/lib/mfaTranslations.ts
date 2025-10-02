/**
 * MFA Translation Strings
 * 
 * This file contains all the translation strings used in MFA components.
 * It supports multiple languages for internationalization (i18n).
 */

export const mfaTranslations = {
  en: {
    // MFA Setup
    'mfa.setup_title': 'Set Up Two-Factor Authentication',
    'mfa.setup_description': 'Two-factor authentication adds an extra layer of security to your account.',
    'mfa.scan_qr_code': 'Scan this QR code with your authenticator app',
    'mfa.manual_code': 'Or enter this code manually:',
    'mfa.verify_code': 'Enter the verification code from your authenticator app',
    'mfa.setup_complete': 'Two-factor authentication is now set up',
    'mfa.generate_recovery': 'Generate Recovery Codes',
    'mfa.enable_mfa': 'Enable Two-Factor Authentication',
    
    // MFA Verification
    'mfa.security_verification': 'SECURITY VERIFICATION',
    'mfa.enter_code_from_app': 'Enter the verification code from your authenticator app to continue.',
    'mfa.verification_code': 'VERIFICATION CODE',
    'mfa.code_refreshes': 'Code refreshes when timer reaches zero',
    'mfa.enter_recovery_code': 'Enter one of your recovery codes. Remember, each code can only be used once.',
    'mfa.recovery_code': 'RECOVERY CODE',
    'mfa.remember_device': 'Remember this device for 30 days',
    'mfa.verifying': 'VERIFYING...',
    'mfa.verify': 'VERIFY',
    'mfa.use_verification_code': 'USE VERIFICATION CODE INSTEAD',
    'mfa.use_recovery_code': 'USE A RECOVERY CODE INSTEAD',
    'mfa.cancel': 'CANCEL AND RETURN TO LOGIN',
    'mfa.lost_device': 'Lost your authentication device and recovery codes?',
    'mfa.initiate_recovery': 'INITIATE MFA RECOVERY PROCESS',
    'mfa.session_expired': 'MFA session expired. Please log in again.',
    'mfa.enter_verification_code': 'Please enter the verification code',
    'mfa.enter_recovery_code_prompt': 'Please enter a recovery code',
    'mfa.verification_failed': 'Verification failed',
    'mfa.unexpected_error': 'An unexpected error occurred',
    
    // Recovery Codes
    'mfa.recovery_codes_title': 'Recovery Codes',
    'mfa.recovery_codes_description': 'Save these recovery codes in a secure location. You can use them to regain access to your account if you lose your authenticator device.',
    'mfa.recovery_codes_warning': 'Each code can only be used once.',
    'mfa.print_codes': 'Print Codes',
    'mfa.download_codes': 'Download Codes',
    'mfa.copy_codes': 'Copy Codes',
    'mfa.codes_copied': 'Recovery codes copied to clipboard',
    'mfa.continue': 'Continue',
    
    // MFA Recovery Process
    'mfa.recovery_title': 'MFA RECOVERY',
    'mfa.recovery_email': 'EMAIL ADDRESS',
    'mfa.recovery_continue': 'CONTINUE',
    'mfa.recovery_sending': 'SENDING...',
    'mfa.recovery_email_sent': 'We\'ve sent a verification code to',
    'mfa.recovery_verification_code': 'VERIFICATION CODE',
    'mfa.recovery_verifying': 'VERIFYING...',
    'mfa.recovery_resend_code': 'Resend code',
    'mfa.recovery_identity_verify': 'To verify your identity, please provide the following information.',
    'mfa.recovery_full_name': 'FULL NAME (AS ON ACCOUNT)',
    'mfa.recovery_date_birth': 'DATE OF BIRTH',
    'mfa.recovery_payment_last_four': 'LAST 4 DIGITS OF PAYMENT CARD',
    'mfa.recovery_submit_request': 'SUBMIT RECOVERY REQUEST',
    'mfa.recovery_processing': 'Processing Your Request',
    'mfa.recovery_please_wait': 'Please wait while we verify your information and process your recovery request.',
    'mfa.recovery_submitted': 'Recovery Request Submitted',
    'mfa.recovery_case_number': 'Your case number:',
    'mfa.recovery_submitted_description': 'Your MFA recovery request has been submitted successfully. Our security team will review your request and contact you via email within 24-48 hours.',
    'mfa.recovery_return_signin': 'RETURN TO SIGN IN',
    'mfa.recovery_contact_support': 'Contact Support',
    'mfa.recovery_remember_credentials': 'Remember your MFA credentials?',
    'mfa.recovery_return': 'Return to sign in',
    
    // MFA Admin
    'mfa.admin_title': 'MFA Recovery Management',
    'mfa.admin_total_requests': 'Total Requests',
    'mfa.admin_pending': 'Pending',
    'mfa.admin_approved': 'Approved',
    'mfa.admin_rejected': 'Rejected',
    'mfa.admin_avg_time': 'Avg. Resolution Time',
    'mfa.admin_search': 'Search case number or email...',
    'mfa.admin_loading': 'Loading recovery requests...',
    'mfa.admin_no_requests': 'No recovery requests found matching your criteria.',
    'mfa.admin_case_number': 'Case Number',
    'mfa.admin_email': 'Email',
    'mfa.admin_status': 'Status',
    'mfa.admin_created': 'Created',
    'mfa.admin_updated': 'Updated',
    'mfa.admin_actions': 'Actions',
    'mfa.admin_view_details': 'View Details',
    'mfa.admin_details': 'Recovery Request Details',
    'mfa.admin_review_notes': 'Review Notes',
    'mfa.admin_approve': 'Approve Request',
    'mfa.admin_reject': 'Reject Request',
    'mfa.admin_complete': 'Complete Recovery Process',
    'mfa.admin_processing': 'Processing...',
    'mfa.admin_disable_warning': 'This will disable MFA for the user and remove all MFA factors and recovery codes.',
  },
  
  nb: {
    // MFA Setup
    'mfa.setup_title': 'Konfigurer tofaktorautentisering',
    'mfa.setup_description': 'Tofaktorautentisering gir et ekstra lag med sikkerhet til kontoen din.',
    'mfa.scan_qr_code': 'Skann denne QR-koden med autentiseringsappen din',
    'mfa.manual_code': 'Eller skriv inn denne koden manuelt:',
    'mfa.verify_code': 'Skriv inn bekreftelseskoden fra autentiseringsappen din',
    'mfa.setup_complete': 'Tofaktorautentisering er nå konfigurert',
    'mfa.generate_recovery': 'Generer gjenopprettingskoder',
    'mfa.enable_mfa': 'Aktiver tofaktorautentisering',
    
    // MFA Verification
    'mfa.security_verification': 'SIKKERHETSVERIFISERING',
    'mfa.enter_code_from_app': 'Skriv inn bekreftelseskoden fra autentiseringsappen din for å fortsette.',
    'mfa.verification_code': 'BEKREFTELSESKODE',
    'mfa.code_refreshes': 'Koden oppdateres når tidtakeren når null',
    'mfa.enter_recovery_code': 'Skriv inn en av gjenopprettingskodene dine. Husk, hver kode kan bare brukes én gang.',
    'mfa.recovery_code': 'GJENOPPRETTINGSKODE',
    'mfa.remember_device': 'Husk denne enheten i 30 dager',
    'mfa.verifying': 'VERIFISERER...',
    'mfa.verify': 'VERIFISER',
    'mfa.use_verification_code': 'BRUK BEKREFTELSESKODE I STEDET',
    'mfa.use_recovery_code': 'BRUK EN GJENOPPRETTINGSKODE I STEDET',
    'mfa.cancel': 'AVBRYT OG GÅ TILBAKE TIL INNLOGGING',
    'mfa.lost_device': 'Mistet autentiseringsenheten og gjenopprettingskodene?',
    'mfa.initiate_recovery': 'START MFA-GJENOPPRETTINGSPROSESS',
    'mfa.session_expired': 'MFA-økt utløpt. Vennligst logg inn på nytt.',
    'mfa.enter_verification_code': 'Vennligst skriv inn bekreftelseskoden',
    'mfa.enter_recovery_code_prompt': 'Vennligst skriv inn en gjenopprettingskode',
    'mfa.verification_failed': 'Verifisering mislyktes',
    'mfa.unexpected_error': 'En uventet feil oppstod',
    
    // Recovery Codes
    'mfa.recovery_codes_title': 'Gjenopprettingskoder',
    'mfa.recovery_codes_description': 'Lagre disse gjenopprettingskodene på et sikkert sted. Du kan bruke dem for å få tilgang til kontoen din hvis du mister autentiseringsenheten din.',
    'mfa.recovery_codes_warning': 'Hver kode kan kun brukes én gang.',
    'mfa.print_codes': 'Skriv ut koder',
    'mfa.download_codes': 'Last ned koder',
    'mfa.copy_codes': 'Kopier koder',
    'mfa.codes_copied': 'Gjenopprettingskoder kopiert til utklippstavlen',
    'mfa.continue': 'Fortsett',
    
    // MFA Recovery Process
    'mfa.recovery_title': 'MFA-GJENOPPRETTING',
    'mfa.recovery_email': 'E-POSTADRESSE',
    'mfa.recovery_continue': 'FORTSETT',
    'mfa.recovery_sending': 'SENDER...',
    'mfa.recovery_email_sent': 'Vi har sendt en bekreftelseskode til',
    'mfa.recovery_verification_code': 'BEKREFTELSESKODE',
    'mfa.recovery_verifying': 'VERIFISERER...',
    'mfa.recovery_resend_code': 'Send kode på nytt',
    'mfa.recovery_identity_verify': 'For å verifisere identiteten din, vennligst oppgi følgende informasjon.',
    'mfa.recovery_full_name': 'FULLT NAVN (SOM PÅ KONTO)',
    'mfa.recovery_date_birth': 'FØDSELSDATO',
    'mfa.recovery_payment_last_four': 'SISTE 4 SIFFER AV BETALINGSKORT',
    'mfa.recovery_submit_request': 'SEND GJENOPPRETTINGSFORESPØRSEL',
    'mfa.recovery_processing': 'Behandler forespørselen din',
    'mfa.recovery_please_wait': 'Vennligst vent mens vi verifiserer informasjonen din og behandler gjenopprettingsforespørselen.',
    'mfa.recovery_submitted': 'Gjenopprettingsforespørsel sendt',
    'mfa.recovery_case_number': 'Ditt saksnummer:',
    'mfa.recovery_submitted_description': 'Din MFA-gjenopprettingsforespørsel er sendt. Sikkerhetsteamet vårt vil gjennomgå forespørselen din og kontakte deg via e-post innen 24-48 timer.',
    'mfa.recovery_return_signin': 'TILBAKE TIL INNLOGGING',
    'mfa.recovery_contact_support': 'Kontakt support',
    'mfa.recovery_remember_credentials': 'Husker du MFA-legitimasjonene dine?',
    'mfa.recovery_return': 'Tilbake til innlogging',
    
    // MFA Admin
    'mfa.admin_title': 'MFA-gjenopprettingsadministrasjon',
    'mfa.admin_total_requests': 'Totale forespørsler',
    'mfa.admin_pending': 'Ventende',
    'mfa.admin_approved': 'Godkjent',
    'mfa.admin_rejected': 'Avvist',
    'mfa.admin_avg_time': 'Gjennomsnittlig løsningstid',
    'mfa.admin_search': 'Søk etter saksnummer eller e-post...',
    'mfa.admin_loading': 'Laster gjenopprettingsforespørsler...',
    'mfa.admin_no_requests': 'Ingen gjenopprettingsforespørsler funnet som matcher kriteriene dine.',
    'mfa.admin_case_number': 'Saksnummer',
    'mfa.admin_email': 'E-post',
    'mfa.admin_status': 'Status',
    'mfa.admin_created': 'Opprettet',
    'mfa.admin_updated': 'Oppdatert',
    'mfa.admin_actions': 'Handlinger',
    'mfa.admin_view_details': 'Se detaljer',
    'mfa.admin_details': 'Detaljer for gjenopprettingsforespørsel',
    'mfa.admin_review_notes': 'Gjennomgangsnotater',
    'mfa.admin_approve': 'Godkjenn forespørsel',
    'mfa.admin_reject': 'Avvis forespørsel',
    'mfa.admin_complete': 'Fullfør gjenopprettingsprosess',
    'mfa.admin_processing': 'Behandler...',
    'mfa.admin_disable_warning': 'Dette vil deaktivere MFA for brukeren og fjerne alle MFA-faktorer og gjenopprettingskoder.',
  },
  
  // Add more languages as needed
};

/**
 * Get translation function for a specific language
 * @param lang Language code (e.g., 'en', 'nb')
 * @returns Translation function that accepts a key and returns the translated string
 */
export function getMfaTranslator(lang: string = 'en') {
  const translations = mfaTranslations[lang as keyof typeof mfaTranslations] || mfaTranslations.en;
  
  return function translate(key: string): string {
    return translations[key as keyof typeof translations] || key;
  };
}

/**
 * MFA translation hook for React components
 * @param lang Language code (e.g., 'en', 'nb')
 * @returns Object with translation function and current language
 */
export function useMfaTranslations(lang: string = 'en') {
  const t = getMfaTranslator(lang);
  
  return {
    t,
    lang,
    availableLanguages: Object.keys(mfaTranslations)
  };
}
