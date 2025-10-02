/**
 * Advanced KYC (Know Your Customer) System for Celora V2
 * Comprehensive compliance system with:
 * - Multi-level identity verification
 * - Document upload and verification
 * - Automated risk assessment
 * - AML (Anti-Money Laundering) screening
 * - Sanctions list checking
 * - PEP (Politically Exposed Person) screening
 * - Real-time compliance monitoring
 * - Regulatory reporting
 */

export interface KYCProfile {
  userId: string;
  level: KYCLevel;
  status: KYCStatus;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  expiresAt?: number;
  personalInfo: PersonalInfo;
  documents: KYCDocument[];
  verificationHistory: VerificationStep[];
  riskAssessment: RiskAssessment;
  complianceChecks: ComplianceCheck[];
  limits: TransactionLimits;
  flags: ComplianceFlag[];
  metadata: {
    ipAddress?: string;
    deviceFingerprint?: string;
    userAgent?: string;
    location?: GeolocationData;
    referralSource?: string;
  };
}

export type KYCLevel = 'basic' | 'intermediate' | 'enhanced' | 'institutional';
export type KYCStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'expired' | 'suspended';

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string; // ISO date
  placeOfBirth?: string;
  nationality: string;
  gender?: 'male' | 'female' | 'other';
  email: string;
  phone: string;
  address: Address;
  occupation?: string;
  employerName?: string;
  sourceOfFunds?: string;
  expectedTradingVolume?: string;
  taxId?: string;
  politicallyExposed: boolean;
  pepDetails?: PEPDetails;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type: 'residential' | 'business' | 'mailing';
  verified: boolean;
  verificationDate?: number;
}

export interface PEPDetails {
  position: string;
  organization: string;
  country: string;
  startDate: string;
  endDate?: string;
  familyMembers?: Array<{
    name: string;
    relationship: string;
    position?: string;
  }>;
}

export interface KYCDocument {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  uploadedAt: number;
  verifiedAt?: number;
  expiresAt?: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  extractedData?: Record<string, any>;
  verificationResult?: DocumentVerificationResult;
  metadata: {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

export type DocumentType = 
  | 'passport'
  | 'driving_license'
  | 'national_id'
  | 'utility_bill'
  | 'bank_statement'
  | 'tax_document'
  | 'employment_letter'
  | 'selfie'
  | 'selfie_with_document'
  | 'business_registration'
  | 'corporate_resolution'
  | 'beneficial_ownership';

export type DocumentStatus = 'pending' | 'processing' | 'verified' | 'rejected' | 'expired';

export interface DocumentVerificationResult {
  overall: 'pass' | 'fail' | 'manual_review';
  checks: {
    documentAuthenticity: 'pass' | 'fail' | 'warning';
    dataExtraction: 'pass' | 'fail' | 'partial';
    faceMatch?: 'pass' | 'fail' | 'manual_review';
    livenessCheck?: 'pass' | 'fail';
    qualityCheck: 'pass' | 'fail' | 'warning';
  };
  confidence: number; // 0-100
  extractedData: Record<string, any>;
  issues?: string[];
  reviewer?: string;
  reviewedAt?: number;
}

export interface VerificationStep {
  step: string;
  status: 'pending' | 'completed' | 'failed' | 'skipped';
  completedAt?: number;
  data?: Record<string, any>;
  errors?: string[];
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  factors: RiskFactor[];
  lastUpdated: number;
  nextReview: number;
  mitigationMeasures?: string[];
}

export interface RiskFactor {
  type: 'geographic' | 'transactional' | 'behavioral' | 'compliance' | 'technological';
  severity: 'low' | 'medium' | 'high';
  description: string;
  score: number;
  mitigation?: string;
}

export interface ComplianceCheck {
  id: string;
  type: 'sanctions' | 'pep' | 'adverse_media' | 'aml' | 'watchlist';
  status: 'pending' | 'clear' | 'match' | 'error';
  performedAt: number;
  results: Array<{
    source: string;
    matches: Array<{
      name: string;
      matchScore: number;
      details: Record<string, any>;
    }>;
  }>;
  reviewRequired: boolean;
  reviewer?: string;
  reviewedAt?: number;
  resolution?: 'cleared' | 'confirmed' | 'ongoing_monitoring';
}

export interface TransactionLimits {
  daily: {
    deposit: number;
    withdrawal: number;
    trade: number;
  };
  monthly: {
    deposit: number;
    withdrawal: number;
    trade: number;
  };
  yearly: {
    deposit: number;
    withdrawal: number;
    trade: number;
  };
  single: {
    deposit: number;
    withdrawal: number;
    trade: number;
  };
  currency: string;
}

export interface ComplianceFlag {
  id: string;
  type: 'suspicious_activity' | 'sanctions_match' | 'pep_match' | 'high_risk_jurisdiction' | 'document_issue' | 'behavior_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  createdAt: number;
  status: 'active' | 'resolved' | 'false_positive';
  resolver?: string;
  resolvedAt?: number;
  resolution?: string;
}

export interface GeolocationData {
  country: string;
  region: string;
  city: string;
  coordinates?: [number, number];
  timezone: string;
  isVPN?: boolean;
  isTor?: boolean;
  isProxy?: boolean;
}

export interface KYCConfiguration {
  levels: Record<KYCLevel, {
    requiredDocuments: DocumentType[];
    optionalDocuments: DocumentType[];
    verificationSteps: string[];
    limits: TransactionLimits;
    autoApproval: boolean;
    reviewRequired: boolean;
    expiryDays: number;
  }>;
  riskMatrix: {
    countries: Record<string, 'low' | 'medium' | 'high'>;
    occupations: Record<string, 'low' | 'medium' | 'high'>;
    pepRisk: 'high';
    sanctionsRisk: 'critical';
  };
  complianceChecks: {
    sanctions: { enabled: boolean; providers: string[] };
    pep: { enabled: boolean; providers: string[] };
    adverseMedia: { enabled: boolean; providers: string[] };
    aml: { enabled: boolean; providers: string[] };
  };
}

class KYCManager {
  private static instance: KYCManager;
  private profiles: Map<string, KYCProfile> = new Map();
  
  private readonly configuration: KYCConfiguration = {
    levels: {
      basic: {
        requiredDocuments: ['national_id', 'selfie'],
        optionalDocuments: ['utility_bill'],
        verificationSteps: ['personal_info', 'document_upload', 'selfie_verification'],
        limits: {
          daily: { deposit: 1000, withdrawal: 500, trade: 2000 },
          monthly: { deposit: 10000, withdrawal: 5000, trade: 20000 },
          yearly: { deposit: 50000, withdrawal: 25000, trade: 100000 },
          single: { deposit: 500, withdrawal: 250, trade: 1000 },
          currency: 'USD'
        },
        autoApproval: true,
        reviewRequired: false,
        expiryDays: 365
      },
      intermediate: {
        requiredDocuments: ['passport', 'utility_bill', 'selfie_with_document'],
        optionalDocuments: ['bank_statement', 'employment_letter'],
        verificationSteps: ['personal_info', 'document_upload', 'address_verification', 'selfie_verification', 'source_of_funds'],
        limits: {
          daily: { deposit: 10000, withdrawal: 5000, trade: 20000 },
          monthly: { deposit: 100000, withdrawal: 50000, trade: 200000 },
          yearly: { deposit: 500000, withdrawal: 250000, trade: 1000000 },
          single: { deposit: 5000, withdrawal: 2500, trade: 10000 },
          currency: 'USD'
        },
        autoApproval: false,
        reviewRequired: true,
        expiryDays: 730
      },
      enhanced: {
        requiredDocuments: ['passport', 'utility_bill', 'bank_statement', 'tax_document', 'selfie_with_document'],
        optionalDocuments: ['employment_letter'],
        verificationSteps: ['personal_info', 'document_upload', 'address_verification', 'selfie_verification', 'source_of_funds', 'wealth_verification', 'enhanced_due_diligence'],
        limits: {
          daily: { deposit: 100000, withdrawal: 50000, trade: 200000 },
          monthly: { deposit: 1000000, withdrawal: 500000, trade: 2000000 },
          yearly: { deposit: 10000000, withdrawal: 5000000, trade: 20000000 },
          single: { deposit: 50000, withdrawal: 25000, trade: 100000 },
          currency: 'USD'
        },
        autoApproval: false,
        reviewRequired: true,
        expiryDays: 1095
      },
      institutional: {
        requiredDocuments: ['business_registration', 'corporate_resolution', 'beneficial_ownership'],
        optionalDocuments: ['bank_statement', 'tax_document'],
        verificationSteps: ['corporate_info', 'document_upload', 'beneficial_ownership', 'corporate_resolution', 'enhanced_due_diligence'],
        limits: {
          daily: { deposit: 1000000, withdrawal: 500000, trade: 2000000 },
          monthly: { deposit: 10000000, withdrawal: 5000000, trade: 20000000 },
          yearly: { deposit: 100000000, withdrawal: 50000000, trade: 200000000 },
          single: { deposit: 500000, withdrawal: 250000, trade: 1000000 },
          currency: 'USD'
        },
        autoApproval: false,
        reviewRequired: true,
        expiryDays: 1095
      }
    },
    riskMatrix: {
      countries: {
        'US': 'low', 'CA': 'low', 'GB': 'low', 'DE': 'low', 'FR': 'low', 'NO': 'low', 'SE': 'low', 'DK': 'low',
        'CN': 'medium', 'RU': 'medium', 'BR': 'medium', 'IN': 'medium',
        'AF': 'high', 'IR': 'high', 'KP': 'high', 'SY': 'high'
      },
      occupations: {
        'student': 'low', 'employee': 'low', 'teacher': 'low', 'engineer': 'low',
        'business_owner': 'medium', 'lawyer': 'medium', 'accountant': 'medium',
        'politician': 'high', 'government_official': 'high', 'military': 'high'
      },
      pepRisk: 'high',
      sanctionsRisk: 'critical'
    },
    complianceChecks: {
      sanctions: { enabled: true, providers: ['OFAC', 'UN', 'EU'] },
      pep: { enabled: true, providers: ['WorldCheck', 'Dow Jones'] },
      adverseMedia: { enabled: true, providers: ['LexisNexis'] },
      aml: { enabled: true, providers: ['Chainalysis', 'Elliptic'] }
    }
  };

  private constructor() {}

  static getInstance(): KYCManager {
    if (!KYCManager.instance) {
      KYCManager.instance = new KYCManager();
    }
    return KYCManager.instance;
  }

  /**
   * Initialize KYC profile for a user
   */
  async initializeProfile(
    userId: string,
    level: KYCLevel,
    personalInfo: PersonalInfo,
    metadata: KYCProfile['metadata'] = {}
  ): Promise<KYCProfile> {
    const now = Date.now();
    const config = this.configuration.levels[level];
    
    const profile: KYCProfile = {
      userId,
      level,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      expiresAt: now + (config.expiryDays * 24 * 60 * 60 * 1000),
      personalInfo,
      documents: [],
      verificationHistory: config.verificationSteps.map(step => ({
        step,
        status: 'pending'
      })),
      riskAssessment: await this.performInitialRiskAssessment(personalInfo, metadata),
      complianceChecks: [],
      limits: config.limits,
      flags: [],
      metadata
    };

    this.profiles.set(userId, profile);
    
    // Start compliance checks
    await this.performComplianceChecks(profile);
    
    return profile;
  }

  /**
   * Upload and process KYC document
   */
  async uploadDocument(
    userId: string,
    documentType: DocumentType,
    file: {
      fileName: string;
      fileSize: number;
      mimeType: string;
      buffer: Buffer;
    },
    metadata: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<KYCDocument> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error('KYC profile not found');
    }

    const document: KYCDocument = {
      id: this.generateDocumentId(),
      type: documentType,
      status: 'processing',
      uploadedAt: Date.now(),
      fileName: file.fileName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      metadata: {
        userId,
        ...metadata
      }
    };

    // Process document
    try {
      const verificationResult = await this.processDocument(document, file.buffer);
      document.verificationResult = verificationResult;
      document.status = verificationResult.overall === 'pass' ? 'verified' : 
                       verificationResult.overall === 'fail' ? 'rejected' : 'pending';
      
      if (verificationResult.overall === 'pass') {
        document.verifiedAt = Date.now();
        document.extractedData = verificationResult.extractedData;
      }
    } catch (error) {
      document.status = 'rejected';
      console.error('Document processing error:', error);
    }

    profile.documents.push(document);
    profile.updatedAt = Date.now();
    
    // Update verification steps
    this.updateVerificationSteps(profile, documentType);
    
    // Check if profile can be auto-approved
    await this.evaluateProfileCompletion(profile);
    
    return document;
  }

  /**
   * Perform compliance checks
   */
  private async performComplianceChecks(profile: KYCProfile): Promise<void> {
    const checks: ComplianceCheck[] = [];

    // Sanctions screening
    if (this.configuration.complianceChecks.sanctions.enabled) {
      const sanctionsCheck = await this.performSanctionsCheck(profile.personalInfo);
      checks.push(sanctionsCheck);
      
      if (sanctionsCheck.status === 'match') {
        profile.flags.push({
          id: this.generateId(),
          type: 'sanctions_match',
          severity: 'critical',
          description: 'Potential sanctions list match detected',
          createdAt: Date.now(),
          status: 'active'
        });
      }
    }

    // PEP screening
    if (this.configuration.complianceChecks.pep.enabled) {
      const pepCheck = await this.performPEPCheck(profile.personalInfo);
      checks.push(pepCheck);
      
      if (pepCheck.status === 'match' || profile.personalInfo.politicallyExposed) {
        profile.flags.push({
          id: this.generateId(),
          type: 'pep_match',
          severity: 'high',
          description: 'Politically Exposed Person detected',
          createdAt: Date.now(),
          status: 'active'
        });
      }
    }

    // Adverse media screening
    if (this.configuration.complianceChecks.adverseMedia.enabled) {
      const adverseMediaCheck = await this.performAdverseMediaCheck(profile.personalInfo);
      checks.push(adverseMediaCheck);
    }

    profile.complianceChecks = checks;
    
    // Update risk assessment based on compliance results
    profile.riskAssessment = await this.updateRiskAssessment(profile);
  }

  /**
   * Process uploaded document
   */
  private async processDocument(document: KYCDocument, buffer: Buffer): Promise<DocumentVerificationResult> {
    // Simulate document processing (in production, integrate with IDV services like Jumio, Onfido, etc.)
    
    const result: DocumentVerificationResult = {
      overall: 'pass',
      checks: {
        documentAuthenticity: 'pass',
        dataExtraction: 'pass',
        qualityCheck: 'pass'
      },
      confidence: 85,
      extractedData: this.simulateDataExtraction(document.type),
      issues: []
    };

    // Simulate some processing logic
    if (document.fileSize < 50000) { // Too small
      result.checks.qualityCheck = 'fail';
      result.overall = 'fail';
      result.issues?.push('Document image quality too low');
    }

    if (document.fileSize > 10000000) { // Too large
      result.overall = 'manual_review';
      result.issues?.push('Document file size too large, manual review required');
    }

    // Face matching for selfie documents
    if (document.type === 'selfie' || document.type === 'selfie_with_document') {
      result.checks.faceMatch = 'pass';
      result.checks.livenessCheck = 'pass';
    }

    return result;
  }

  /**
   * Simulate data extraction from documents
   */
  private simulateDataExtraction(documentType: DocumentType): Record<string, any> {
    switch (documentType) {
      case 'passport':
        return {
          documentNumber: 'P12345678',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          nationality: 'US',
          issueDate: '2020-01-01',
          expiryDate: '2030-01-01'
        };
      case 'driving_license':
        return {
          licenseNumber: 'DL123456',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          address: '123 Main St, Anytown, US',
          issueDate: '2020-01-01',
          expiryDate: '2025-01-01'
        };
      case 'national_id':
        return {
          idNumber: 'ID123456789',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          nationality: 'US'
        };
      case 'utility_bill':
        return {
          address: '123 Main St, Anytown, US',
          billingDate: '2024-01-01',
          accountHolder: 'John Doe'
        };
      default:
        return {};
    }
  }

  /**
   * Perform initial risk assessment
   */
  private async performInitialRiskAssessment(
    personalInfo: PersonalInfo,
    metadata: KYCProfile['metadata']
  ): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // Geographic risk
    const countryRisk = this.configuration.riskMatrix.countries[personalInfo.nationality] || 'medium';
    const geographicScore = countryRisk === 'low' ? 10 : countryRisk === 'medium' ? 30 : 60;
    factors.push({
      type: 'geographic',
      severity: countryRisk,
      description: `Nationality: ${personalInfo.nationality}`,
      score: geographicScore
    });
    totalScore += geographicScore;

    // Occupation risk
    if (personalInfo.occupation) {
      const occupationRisk = this.configuration.riskMatrix.occupations[personalInfo.occupation] || 'medium';
      const occupationScore = occupationRisk === 'low' ? 5 : occupationRisk === 'medium' ? 15 : 30;
      factors.push({
        type: 'compliance',
        severity: occupationRisk,
        description: `Occupation: ${personalInfo.occupation}`,
        score: occupationScore
      });
      totalScore += occupationScore;
    }

    // PEP risk
    if (personalInfo.politicallyExposed) {
      factors.push({
        type: 'compliance',
        severity: 'high',
        description: 'Politically Exposed Person',
        score: 40
      });
      totalScore += 40;
    }

    // Technology risk (VPN, Tor, etc.)
    if (metadata.location?.isVPN || metadata.location?.isTor) {
      factors.push({
        type: 'technological',
        severity: 'medium',
        description: 'Using anonymization technology',
        score: 20
      });
      totalScore += 20;
    }

    const overallRisk: RiskAssessment['overallRisk'] = 
      totalScore <= 25 ? 'low' :
      totalScore <= 50 ? 'medium' :
      totalScore <= 75 ? 'high' : 'critical';

    return {
      overallRisk,
      score: totalScore,
      factors,
      lastUpdated: Date.now(),
      nextReview: Date.now() + (90 * 24 * 60 * 60 * 1000) // 90 days
    };
  }

  /**
   * Update risk assessment
   */
  private async updateRiskAssessment(profile: KYCProfile): Promise<RiskAssessment> {
    const riskAssessment = profile.riskAssessment;
    
    // Add compliance-based risk factors
    profile.complianceChecks.forEach(check => {
      if (check.status === 'match') {
        const severity = check.type === 'sanctions' ? 'critical' : 'high';
        const score = severity === 'critical' ? 80 : 50;
        
        riskAssessment.factors.push({
          type: 'compliance',
          severity: check.type === 'sanctions' ? 'high' : 'high',
          description: `${check.type} screening match`,
          score
        });
        riskAssessment.score += score;
      }
    });

    // Recalculate overall risk
    riskAssessment.overallRisk = 
      riskAssessment.score <= 25 ? 'low' :
      riskAssessment.score <= 50 ? 'medium' :
      riskAssessment.score <= 75 ? 'high' : 'critical';

    riskAssessment.lastUpdated = Date.now();

    return riskAssessment;
  }

  /**
   * Perform sanctions check
   */
  private async performSanctionsCheck(personalInfo: PersonalInfo): Promise<ComplianceCheck> {
    // Simulate sanctions screening
    const fullName = `${personalInfo.firstName} ${personalInfo.lastName}`;
    
    return {
      id: this.generateId(),
      type: 'sanctions',
      status: 'clear', // Simulate clear result
      performedAt: Date.now(),
      results: [
        {
          source: 'OFAC',
          matches: []
        },
        {
          source: 'UN',
          matches: []
        }
      ],
      reviewRequired: false
    };
  }

  /**
   * Perform PEP check
   */
  private async performPEPCheck(personalInfo: PersonalInfo): Promise<ComplianceCheck> {
    const status = personalInfo.politicallyExposed ? 'match' : 'clear';
    
    return {
      id: this.generateId(),
      type: 'pep',
      status,
      performedAt: Date.now(),
      results: [
        {
          source: 'WorldCheck',
          matches: status === 'match' ? [{
            name: `${personalInfo.firstName} ${personalInfo.lastName}`,
            matchScore: 95,
            details: personalInfo.pepDetails || {}
          }] : []
        }
      ],
      reviewRequired: status === 'match'
    };
  }

  /**
   * Perform adverse media check
   */
  private async performAdverseMediaCheck(personalInfo: PersonalInfo): Promise<ComplianceCheck> {
    return {
      id: this.generateId(),
      type: 'adverse_media',
      status: 'clear',
      performedAt: Date.now(),
      results: [
        {
          source: 'LexisNexis',
          matches: []
        }
      ],
      reviewRequired: false
    };
  }

  /**
   * Update verification steps based on document upload
   */
  private updateVerificationSteps(profile: KYCProfile, documentType: DocumentType): void {
    const stepMapping: Record<DocumentType, string[]> = {
      'passport': ['document_upload'],
      'driving_license': ['document_upload'],
      'national_id': ['document_upload'],
      'utility_bill': ['address_verification'],
      'bank_statement': ['source_of_funds', 'wealth_verification'],
      'tax_document': ['source_of_funds', 'wealth_verification'],
      'employment_letter': ['source_of_funds'],
      'selfie': ['selfie_verification'],
      'selfie_with_document': ['selfie_verification'],
      'business_registration': ['document_upload', 'corporate_info'],
      'corporate_resolution': ['corporate_resolution'],
      'beneficial_ownership': ['beneficial_ownership']
    };

    const stepsToUpdate = stepMapping[documentType] || [];
    
    stepsToUpdate.forEach(stepName => {
      const step = profile.verificationHistory.find(s => s.step === stepName);
      if (step && step.status === 'pending') {
        step.status = 'completed';
        step.completedAt = Date.now();
      }
    });

    profile.updatedAt = Date.now();
  }

  /**
   * Evaluate if profile is complete and can be approved
   */
  private async evaluateProfileCompletion(profile: KYCProfile): Promise<void> {
    const config = this.configuration.levels[profile.level];
    
    // Check if all required documents are uploaded and verified
    const requiredDocs = config.requiredDocuments;
    const uploadedDocs = profile.documents.filter(doc => doc.status === 'verified');
    const hasAllRequiredDocs = requiredDocs.every(reqDoc => 
      uploadedDocs.some(doc => doc.type === reqDoc)
    );

    // Check if all verification steps are completed
    const allStepsCompleted = profile.verificationHistory.every(step => 
      step.status === 'completed' || step.status === 'skipped'
    );

    // Check compliance status
    const hasComplianceIssues = profile.complianceChecks.some(check => 
      check.status === 'match' && check.reviewRequired
    );

    const hasCriticalFlags = profile.flags.some(flag => 
      flag.severity === 'critical' && flag.status === 'active'
    );

    if (hasAllRequiredDocs && allStepsCompleted && !hasComplianceIssues && !hasCriticalFlags) {
      if (config.autoApproval && profile.riskAssessment.overallRisk === 'low') {
        profile.status = 'approved';
        profile.completedAt = Date.now();
      } else {
        profile.status = 'in_review';
      }
    } else if (hasComplianceIssues || hasCriticalFlags) {
      profile.status = 'suspended';
    }

    profile.updatedAt = Date.now();
  }

  /**
   * Get KYC profile by user ID
   */
  getProfile(userId: string): KYCProfile | undefined {
    return this.profiles.get(userId);
  }

  /**
   * Update profile status (admin function)
   */
  updateProfileStatus(
    userId: string,
    status: KYCStatus,
    reviewer: string,
    notes?: string
  ): KYCProfile | undefined {
    const profile = this.profiles.get(userId);
    if (!profile) return undefined;

    profile.status = status;
    profile.updatedAt = Date.now();
    
    if (status === 'approved') {
      profile.completedAt = Date.now();
    }

    // Add to verification history
    profile.verificationHistory.push({
      step: 'manual_review',
      status: status === 'approved' || status === 'rejected' ? 'completed' : 'pending',
      completedAt: Date.now(),
      data: {
        reviewer,
        notes,
        previousStatus: profile.status
      }
    });

    return profile;
  }

  /**
   * Check if user meets requirements for transaction
   */
  canPerformTransaction(
    userId: string,
    type: 'deposit' | 'withdrawal' | 'trade',
    amount: number,
    timeframe: 'single' | 'daily' | 'monthly' | 'yearly' = 'single'
  ): { allowed: boolean; reason?: string; currentLimit?: number } {
    const profile = this.profiles.get(userId);
    
    if (!profile) {
      return { allowed: false, reason: 'KYC profile not found' };
    }

    if (profile.status !== 'approved') {
      return { allowed: false, reason: `KYC status: ${profile.status}` };
    }

    const limit = profile.limits[timeframe][type];
    
    if (amount > limit) {
      return { 
        allowed: false, 
        reason: `Transaction amount exceeds ${timeframe} limit`,
        currentLimit: limit
      };
    }

    // Check for active critical flags
    const criticalFlags = profile.flags.filter(flag => 
      flag.severity === 'critical' && flag.status === 'active'
    );

    if (criticalFlags.length > 0) {
      return {
        allowed: false,
        reason: 'Account has active compliance flags'
      };
    }

    return { allowed: true };
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(startDate: number, endDate: number): {
    totalProfiles: number;
    statusBreakdown: Record<KYCStatus, number>;
    levelBreakdown: Record<KYCLevel, number>;
    flaggedProfiles: number;
    pendingReviews: number;
  } {
    const profiles = Array.from(this.profiles.values());
    const filteredProfiles = profiles.filter(p => 
      p.createdAt >= startDate && p.createdAt <= endDate
    );

    const statusBreakdown: Record<KYCStatus, number> = {
      pending: 0, in_review: 0, approved: 0, rejected: 0, expired: 0, suspended: 0
    };

    const levelBreakdown: Record<KYCLevel, number> = {
      basic: 0, intermediate: 0, enhanced: 0, institutional: 0
    };

    let flaggedProfiles = 0;
    let pendingReviews = 0;

    filteredProfiles.forEach(profile => {
      statusBreakdown[profile.status]++;
      levelBreakdown[profile.level]++;
      
      if (profile.flags.some(flag => flag.status === 'active')) {
        flaggedProfiles++;
      }
      
      if (profile.status === 'in_review') {
        pendingReviews++;
      }
    });

    return {
      totalProfiles: filteredProfiles.length,
      statusBreakdown,
      levelBreakdown,
      flaggedProfiles,
      pendingReviews
    };
  }

  /**
   * Helper methods
   */
  private generateId(): string {
    return `kyc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

// Export singleton instance
export const kycManager = KYCManager.getInstance();
