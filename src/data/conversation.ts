import type { Claim, ChatMessage, EmailDraft } from '../types';

export function buildQuery(claim: Claim): string {
  return `Verify coverage for the ${claim.claimantName} claim and check for ${claim.lossType.toLowerCase()} coverage.`;
}

export function buildConversation(claim: Claim): ChatMessage[] {
  return [
    {
      id: 'msg-1',
      sender: 'user',
      type: 'text',
      content: buildQuery(claim),
    },
    {
      id: 'msg-2',
      sender: 'ai',
      type: 'status',
      content: 'ACCESSING POLICY & COVERAGE',
    },
    {
      id: 'msg-3',
      sender: 'ai',
      type: 'result',
      content: '',
      results: [
        {
          label: 'Coverage Verification',
          value: `${claim.lossType} coverage confirmed on Policy ${claim.policyNumber}.`,
          confirmed: true,
        },
        {
          label: 'Reserve Recommendation',
          value: `$${claim.reserve.toLocaleString()} — adjuster review required.`,
          confirmed: true,
        },
        {
          label: 'AI Claim Note',
          value: 'Preliminary claim note drafted and ready for adjuster review.',
          confirmed: true,
        },
        {
          label: 'Assignment Email',
          value: `Addressed to ${claim.assignedAdjuster} — ready for dispatch.`,
          confirmed: true,
        },
        {
          label: 'Supporting Evidence',
          value: 'Policy verification, coverage analysis, and loss correlation complete.',
          confirmed: true,
        },
      ],
      followUp: 'AI documentation package prepared for review.',
      actions: [],
    },
  ];
}

export function buildFallbackResponse(claim: Claim, text: string): string {
  const lower = text.toLowerCase();
  if (/customer|claimant|insured/.test(lower)) {
    return `Based on the current claim context, the customer/insured is ${claim.claimantName}. The claim is associated with Policy ${claim.policyNumber}, loss type ${claim.lossType}, and current reserve $${claim.reserve.toLocaleString()}. Additional customer profile details would come from ClaimCenter or the customer system in production.`;
  }
  if (/reserve/.test(lower)) {
    return `The current recommended reserve is $${claim.reserve.toLocaleString()}, increased from $${claim.initialReserve.toLocaleString()}. This recommendation is pending adjuster review and is supported by coverage verification and available claim context.`;
  }
  if (/policy|coverage/.test(lower)) {
    return `Policy ${claim.policyNumber} is associated with this claim. ${claim.lossType} coverage has been verified in this prototype. In production, QARL would retrieve policy terms, endorsements, limits, and exclusions from PolicyCenter.`;
  }
  if (/next|what should i do/.test(lower)) {
    return `Recommended next step: review the AI documentation package, validate the reserve recommendation, and approve the prepared claim note before governed write-back to ClaimCenter.`;
  }
  return `I can help with claim-scoped questions for this prototype, including coverage, reserve, claimant context, documentation package, next steps, and the AI execution journey.`;
}

export function buildEmailDraft(claim: Claim): EmailDraft {
  return {
    to: 'adjuster@insurer.com',
    subject: `Assignment – ${claim.claimantName} ${claim.lossType} Claim ${claim.id}`,
    body: `Dear Team,

This is to confirm the assignment of claim ${claim.id} for ${claim.claimantName}.

Policy #${claim.policyNumber} has been verified with active ${claim.lossType.toLowerCase()} coverage. The claim was reported on ${claim.dateOfLoss} with an initial reserve set at $${claim.initialReserve.toLocaleString()}, subsequently increased to $${claim.reserve.toLocaleString()}.

Please review the claim file and initiate the coverage investigation. All supporting documentation has been attached to the ClaimCenter record.

Next steps:
- Contact the insured to schedule an on-site inspection
- Review the reserve recommendation and submit for supervisor approval
- Document all findings in ClaimCenter within 48 hours

Best regards,
QARL — Agentic Claims Assistant`,
  };
}
